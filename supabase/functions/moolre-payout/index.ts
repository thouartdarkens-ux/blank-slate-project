import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MOOLRE_BASE = "https://api.moolre.com/open";

// Network code map: human-readable → Moolre channel code
const NETWORK_MAP: Record<string, string> = {
  mtn: "13",
  telecel: "6",
  at: "7",
  airteltigo: "7",
};

function getNetworkCode(input: string): string | null {
  if (!input) return null;
  const normalized = input.toLowerCase().trim();
  if (NETWORK_MAP[normalized]) return NETWORK_MAP[normalized];
  // Already a numeric code
  if (["13", "6", "7"].includes(normalized)) return normalized;
  return null;
}

async function moolreRequest(
  endpoint: string,
  body: Record<string, any>,
  env: Record<string, string>,
): Promise<{ data: any; ok: boolean; status: number }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-KEY": env.MOOLRE_API_KEY,
    "X-API-USER": env.MOOLRE_API_USER,
  };

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

  return { data: parsed, ok: res.ok, status: res.status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // This function is called internally by affiliate-withdraw (no admin key needed),
    // or by admin for manual payouts (admin key required).
    const body = await req.json();
    const { action, withdrawal_id, affiliate_id, amount, recipient_number, recipient_name, network, external_ref } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const env: Record<string, string> = {
      MOOLRE_API_KEY: Deno.env.get("MOOLRE_API_KEY")!,
      MOOLRE_API_USER: Deno.env.get("MOOLRE_API_USER")!,
      MOOLRE_ACCOUNT_NUMBER: Deno.env.get("MOOLRE_ACCOUNT_NUM")!,
    };

    // --- Action: check_balance ---
    if (action === "check_balance") {
      const balRes = await moolreRequest("/account/status", {
        type: 1,
        accountnumber: env.MOOLRE_ACCOUNT_NUMBER,
      }, env);

      const balance = balRes.data?.data?.balance ?? null;

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
        return new Response(JSON.stringify({
          error: "withdrawal_id, affiliate_id, amount, recipient_number, and network are required",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const networkCode = getNetworkCode(network);
      if (!networkCode) {
        return new Response(JSON.stringify({ error: `Invalid network: ${network}. Use MTN, Telecel, or AT.` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const amt = Number(amount);
      const ref = external_ref || `PAYOUT_${Date.now()}_${withdrawal_id.slice(0, 8)}`;

      // Step 1: Check balance
      const balRes = await moolreRequest("/account/status", {
        type: 1,
        accountnumber: env.MOOLRE_ACCOUNT_NUMBER,
      }, env);

      const balance = Number(balRes.data?.data?.balance ?? 0);
      await supabase.from("payout_transactions").insert({
        withdrawal_id, affiliate_id, type: "balance_check", amount: 0,
        status: balRes.ok ? "success" : "failed",
        response_code: balRes.data?.code?.toString() || null,
        response_message: balRes.data?.message || null,
        raw_response: balRes.data,
      });

      if (!balRes.ok || balance < amt) {
        return new Response(JSON.stringify({
          error: "Insufficient Moolre balance for payout",
          balance, required: amt,
        }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Step 2: Validate recipient
      const validateRes = await moolreRequest("/transact/validate", {
        type: 1,
        receiver: recipient_number,
        channel: networkCode,
        currency: "GHS",
        accountnumber: env.MOOLRE_ACCOUNT_NUMBER,
      }, env);

      const validatedName = validateRes.data?.data || null;
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
        return new Response(JSON.stringify({
          error: "Recipient validation failed",
          details: validateRes.data,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Name match check (fuzzy — first name match)
      const expectedFirstName = (recipient_name || "").toUpperCase().split(/\s+/)[0];
      if (expectedFirstName && !validatedName.includes(expectedFirstName)) {
        await supabase.from("payout_transactions").insert({
          withdrawal_id, affiliate_id, type: "validation",
          recipient_number, recipient_name: validatedName,
          amount: amt, network: networkCode,
          status: "failed",
          response_message: `Name mismatch: expected ${recipient_name}, got ${validatedName}`,
        });
        return new Response(JSON.stringify({
          error: "Name mismatch",
          expected: recipient_name,
          registered: validatedName,
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Step 3: Initiate transfer
      const transferRes = await moolreRequest("/transact/transfer", {
        type: 1,
        channel: networkCode,
        currency: "GHS",
        amount: amt,
        receiver: recipient_number,
        externalref: ref,
        accountnumber: env.MOOLRE_ACCOUNT_NUMBER,
      }, env);

      const transferOk = transferRes.ok && /^(success|successful|ok)$/i.test(transferRes.data?.message || "");
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
        return new Response(JSON.stringify({
          error: "Transfer failed",
          details: transferRes.data,
          external_ref: ref,
        }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        success: true,
        external_ref: ref,
        recipient_name: validatedName,
        amount: amt,
        message: transferRes.data?.message || "Transfer successful",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use check_balance or process_payout." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
