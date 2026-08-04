import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MOOLRE_BASE = "https://api.moolre.com/open";

const log = (stage: string, data: any = {}) => {
  try {
    console.log(`[moolre-payout] ${stage}`, JSON.stringify(data));
  } catch {
    console.log(`[moolre-payout] ${stage}`, data);
  }
};

// Network code map: human-readable → Moolre channel code
const NETWORK_MAP: Record<string, string> = {
  mtn: "1",
  telecel: "6",
  at: "7",
  airteltigo: "7",
};

function getNetworkCode(input: string): string | null {
  if (!input) return null;
  const normalized = input.toLowerCase().trim();
  if (NETWORK_MAP[normalized]) return NETWORK_MAP[normalized];
  if (["13", "6", "7"].includes(normalized)) return normalized;
  return null;
}

async function moolreRequest(
  endpoint: string,
  body: Record<string, any>,
  env: Record<string, string>,
  reqId: string,
): Promise<{ data: any; ok: boolean; status: number }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-KEY": env.MOOLRE_API_KEY,
    "X-API-USER": env.MOOLRE_API_USER,
  };

  log("moolre_call_start", { reqId, endpoint, body });
  const res = await fetch(`${MOOLRE_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  let parsed: any = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = { raw: await res.text() };
  }
  log("moolre_call_response", { reqId, endpoint, status: res.status, ok: res.ok, data: parsed });

  return { data: parsed, ok: res.ok, status: res.status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const reqId = crypto.randomUUID();
  log("request_received", { reqId, method: req.method, url: req.url });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Helper: update withdrawal status + notes on failures/blocks
  const updateWithdrawal = async (
    withdrawal_id: string | undefined,
    status: string,
    notes: string,
    extra: Record<string, any> = {},
  ) => {
    if (!withdrawal_id) return;
    try {
      await supabase
        .from("affiliate_withdrawals")
        .update({
          status,
          notes,
          updated_at: new Date().toISOString(),
          ...extra,
        })
        .eq("id", withdrawal_id);
      log("withdrawal_status_updated", { reqId, withdrawal_id, status, notes });
    } catch (e) {
      log("withdrawal_status_update_failed", { reqId, withdrawal_id, error: (e as Error).message });
    }
  };

  let currentWithdrawalId: string | undefined;

  try {
    const body = await req.json();
    const {
      action,
      withdrawal_id,
      affiliate_id,
      amount,
      recipient_number,
      recipient_name,
      network,
      external_ref,
    } = body;
    currentWithdrawalId = withdrawal_id;
    log("request_body", {
      reqId, action, withdrawal_id, affiliate_id, amount, recipient_number, recipient_name, network, external_ref,
    });

    const env: Record<string, string> = {
      MOOLRE_API_KEY: Deno.env.get("MOOLRE_API_KEY")!,
      MOOLRE_API_USER: Deno.env.get("MOOLRE_API_USER")!,
      MOOLRE_ACCOUNT_NUMBER: Deno.env.get("MOOLRE_ACCOUNT_NUM")!,
    };
    log("env_loaded", {
      reqId,
      has_api_key: !!env.MOOLRE_API_KEY,
      has_api_user: !!env.MOOLRE_API_USER,
      account_number: env.MOOLRE_ACCOUNT_NUMBER,
    });

    // --- Action: check_balance ---
    if (action === "check_balance") {
      const balRes = await moolreRequest("/account/status", {
        type: 1,
        accountnumber: env.MOOLRE_ACCOUNT_NUMBER,
      }, env, reqId);

      const balance = balRes.data?.data?.balance ?? null;
      log("check_balance_result", { reqId, balance, ok: balRes.ok });

      await supabase.from("payout_transactions").insert({
        affiliate_id: affiliate_id || null,
        type: "balance_check",
        amount: 0,
        status: balRes.ok ? "success" : "failed",
        response_code: balRes.data?.code?.toString() || null,
        response_message: balRes.data?.message || null,
        raw_response: balRes.data,
      });

      if (!balRes.ok || balance === null) {
        return new Response(JSON.stringify({
          error: "Failed to check balance",
          details: balRes.data,
        }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ balance }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Action: process_payout (validate + transfer) ---
    if (action === "process_payout") {
      if (!withdrawal_id || !affiliate_id || !amount || !recipient_number || !network) {
        log("process_payout_validation_failed", {
          reqId, withdrawal_id, affiliate_id, amount, recipient_number, network,
        });
        await updateWithdrawal(withdrawal_id, "rejected",
          "Rejected: missing required payout fields (withdrawal_id, affiliate_id, amount, recipient_number, or network).");
        return new Response(JSON.stringify({
          error: "withdrawal_id, affiliate_id, amount, recipient_number, and network are required",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const networkCode = getNetworkCode(network);
      log("network_mapped", { reqId, network, networkCode });
      if (!networkCode) {
        await updateWithdrawal(withdrawal_id, "rejected",
          `Rejected: invalid network "${network}". Must be MTN, Telecel, or AT.`);
        return new Response(JSON.stringify({ error: `Invalid network: ${network}. Use MTN, Telecel, or AT.` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const amt = Number(amount);
      // External ref = withdrawal_id only (no timestamp)
      const ref = external_ref || withdrawal_id;
      log("payout_ref_generated", { reqId, ref, amt });

      // Step 1: Check balance
      log("step_1_balance_check_start", { reqId });
      const balRes = await moolreRequest("/account/status", {
        type: 1,
        accountnumber: env.MOOLRE_ACCOUNT_NUMBER,
      }, env, reqId);

      const balance = Number(balRes.data?.data?.balance ?? 0);
      log("step_1_balance_check_result", { reqId, balance, required: amt, sufficient: balance >= amt });

      await supabase.from("payout_transactions").insert({
        withdrawal_id, affiliate_id, type: "balance_check", amount: 0,
        status: balRes.ok ? "success" : "failed",
        response_code: balRes.data?.code?.toString() || null,
        response_message: balRes.data?.message || null,
        raw_response: balRes.data,
      });

      if (!balRes.ok) {
        await updateWithdrawal(withdrawal_id, "pending",
          "Processing payment: unable to reach Moolre to verify balance. Will retry.");
        return new Response(JSON.stringify({
          error: "Failed to check Moolre balance",
          details: balRes.data,
        }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (balance < amt) {
        log("step_1_insufficient_moolre_balance", { reqId, balance, required: amt });
        await updateWithdrawal(withdrawal_id, "pending", "Processing payment");
        return new Response(JSON.stringify({
          error: "Insufficient Moolre balance for payout",
          balance, required: amt,
        }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Step 2: Validate recipient
      log("step_2_validate_recipient_start", { reqId, recipient_number, networkCode });
      const validateRes = await moolreRequest("/transact/validate", {
        type: 1,
        receiver: recipient_number,
        channel: networkCode,
        currency: "GHS",
        accountnumber: env.MOOLRE_ACCOUNT_NUMBER,
      }, env, reqId);

      const validatedName = validateRes.data?.data || null;
      log("step_2_validation_result", { reqId, validatedName, ok: validateRes.ok });

      await supabase.from("payout_transactions").insert({
        withdrawal_id, affiliate_id, type: "validation",
        recipient_number, recipient_name: validatedName,
        amount: amt, network: networkCode,
        status: validateRes.ok ? "success" : "failed",
        response_code: validateRes.data?.code?.toString() || null,
        response_message: validateRes.data?.message || null,
        raw_response: validateRes.data,
      });

      if (!validateRes.ok || !validatedName) {
        log("step_2_validation_failed", { reqId, details: validateRes.data });
        await updateWithdrawal(withdrawal_id, "rejected",
          `recipient number ${recipient_number} on ${network} could not be validated by Moolre.`);
        return new Response(JSON.stringify({
          error: "Recipient validation failed",
          details: validateRes.data,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Name match check (fuzzy — first name match)
      const expectedFirstName = (recipient_name || "").toUpperCase().split(/\s+/)[0];
      log("step_2_name_match_check", { reqId, expectedFirstName, validatedName });
      if (expectedFirstName && !validatedName.includes(expectedFirstName)) {
        log("step_2_name_mismatch", { reqId, expected: recipient_name, registered: validatedName });
        await supabase.from("payout_transactions").insert({
          withdrawal_id, affiliate_id, type: "validation",
          recipient_number, recipient_name: validatedName,
          amount: amt, network: networkCode,
          status: "failed",
          response_message: `Name mismatch: expected ${recipient_name}, got ${validatedName}`,
        });
        await updateWithdrawal(withdrawal_id, "rejected",
          `Name mismatch. Provided recipient name doesn't match registerd MOMO name please correct and try again`);
        return new Response(JSON.stringify({
          error: "Name mismatch",
          expected: recipient_name,
          registered: validatedName,
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }




      // Step 3: Initiate transfer
      log("step_3_transfer_start", { reqId, ref, amt, recipient_number, networkCode });
      const transferRes = await moolreRequest("/transact/transfer", {
        type: 1,
        channel: networkCode,
        currency: "GHS",
        amount: amt,
        receiver: recipient_number,
        externalref: ref,
        accountnumber: env.MOOLRE_ACCOUNT_NUMBER,
      }, env, reqId);
      console.log("transferOk",transferRes.ok)
      const transferOk = transferRes.ok;
      log("step_3_transfer_result", { reqId, transferOk, message: transferRes.data?.message, code: transferRes.data?.code });

      await supabase.from("payout_transactions").insert({
        withdrawal_id, affiliate_id, type: "transfer",
        recipient_number, recipient_name: validatedName,
        amount: amt, network: networkCode, external_ref: ref,
        status: transferOk ? "success" : "failed",
        response_code: transferRes.data?.code?.toString() || null,
        response_message: transferRes.data?.message || null,
        raw_response: transferRes.data,
      });

      if (!transferOk) {
        log("step_3_transfer_failed", { reqId, details: transferRes.data });
        await updateWithdrawal(withdrawal_id, "pending",
          `Processing payment: Moolre transfer did not confirm (${transferRes.data?.message || "unknown response"}). Will be reviewed manually.`,
          { payout_error: transferRes.data?.message || "Transfer failed", payout_reference: ref });
        return new Response(JSON.stringify({
          error: "Transfer failed",
          details: transferRes.data,
          external_ref: ref,
        }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }else if(transferOk)
      {
      log("step_3_transfer_success", { reqId, details: transferRes.data });
        await updateWithdrawal(withdrawal_id, "paid",
          `payment successfull`,
          { payout_error: transferRes.data?.message || "Transfer success", payout_reference: ref });
        return new Response(JSON.stringify({
          error: "Transfer successful",
          details: transferRes.data,
          external_ref: ref,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      }

      log("process_payout_success", { reqId, ref, validatedName, amt });
      return new Response(JSON.stringify({
        success: true,
        external_ref: ref,
        recipient_name: validatedName,
        amount: amt,
        message: transferRes.data?.message || "Transfer successful",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    log("unknown_action", { reqId, action });
    return new Response(JSON.stringify({ error: "Unknown action. Use check_balance or process_payout." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log("unhandled_error", { reqId, error: (e as Error).message, stack: (e as Error).stack });
    await updateWithdrawal(currentWithdrawalId, "pending",
      `Processing payment: unexpected error — ${(e as Error).message}. Will be reviewed manually.`);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
