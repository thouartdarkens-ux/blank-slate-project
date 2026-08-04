import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const log = (stage: string, data: any = {}) => {
  try {
    console.log(`[affiliate-withdraw] ${stage}`, JSON.stringify(data));
  } catch {
    console.log(`[affiliate-withdraw] ${stage}`, data);
  }
};

const isSuccessful = (status: string) =>
  /^(success|successful|completed|paid)$/i.test((status || "").trim());

const isPaidOut = (status: string) =>
  /^(paid|completed|approved)$/i.test((status || "").trim());

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const reqId = crypto.randomUUID();
  log("request_received", { reqId, method: req.method, url: req.url });

  try {
    const body = await req.json();
    const { token, amount, notes } = body;
    log("request_body", { reqId, hasToken: !!token, amount, notes });

    const amt = Number(amount);
    if (!token || !amt || amt <= 0) {
      log("validation_failed", { reqId, reason: "token or amount invalid", amount });
      return new Response(
        JSON.stringify({ error: "token and positive amount required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Token prefix is the affiliate's source_hook (set at login time)
    const sessionKey = token.split(".")[0].toUpperCase();
    log("session_key_derived", { reqId, sessionKey });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: affiliate, error: affErr } = await supabase
      .from("affiliates")
      .select("id, commission_rate, source_hook, balance, momo_number, momo_name, momo_network")
      .eq("source_hook", sessionKey)
      .maybeSingle();

    if (affErr || !affiliate) {
      log("affiliate_lookup_failed", { reqId, sessionKey, error: affErr?.message });
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log("affiliate_found", {
      reqId,
      affiliate_id: affiliate.id,
      source_hook: affiliate.source_hook,
      commission_rate: affiliate.commission_rate,
      momo_number: affiliate.momo_number,
      momo_network: affiliate.momo_network,
      stored_balance: affiliate.balance,
    });

    // --- Recompute available balance server-side ---
    const commissionRate = Number(affiliate.commission_rate || 0);
    let transactions: any[] = [];
    if (affiliate.source_hook) {
      const { data: txs } = await supabase
        .from("webhook_transactions")
        .select("amount,status")
        .eq("source_hook", affiliate.source_hook)
        .limit(2000);
      transactions = txs || [];
    }
    const totalSales = transactions
      .filter((t) => isSuccessful(t.status) && Number(t.amount || 0) > 0)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalCommissions = (totalSales * commissionRate) / 100;
    log("commissions_computed", {
      reqId,
      tx_count: transactions.length,
      totalSales,
      commissionRate,
      totalCommissions,
    });

    const { data: withdrawals } = await supabase
      .from("affiliate_withdrawals")
      .select("amount,status")
      .eq("affiliate_id", affiliate.id);

    const paidOut = (withdrawals || [])
      .filter((w) => isPaidOut(w.status))
      .reduce((s, w) => s + Number(w.amount || 0), 0);
    const pending = (withdrawals || [])
      .filter((w) => (w.status || "").toLowerCase() === "pending")
      .reduce((s, w) => s + Number(w.amount || 0), 0);

    const availableBalance = Math.max(totalCommissions - paidOut - pending, 0);
    log("balance_computed", { reqId, paidOut, pending, availableBalance, requested: amt });

    if (amt > availableBalance) {
      log("insufficient_balance", { reqId, availableBalance, requested: amt });
      return new Response(
        JSON.stringify({
          error: `Insufficient balance. Available: GHS ${availableBalance.toFixed(2)}`,
          availableBalance,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Insert withdrawal request ---
    const { data: withdrawal, error: insErr } = await supabase
      .from("affiliate_withdrawals")
      .insert({
        affiliate_id: affiliate.id,
        amount: amt,
        notes: notes || null,
        status: "pending",
        momo_number: affiliate.momo_number || null,
        momo_name: affiliate.momo_name || null,
      })
      .select()
      .single();

    if (insErr) {
      log("withdrawal_insert_failed", { reqId, error: insErr.message });
      throw insErr;
    }
    log("withdrawal_inserted", { reqId, withdrawal_id: withdrawal.id, amount: amt });

    // --- Update stored balance column on affiliates (reserve the amount) ---
    const newBalance = Math.max(availableBalance - amt, 0);
    const { error: updErr } = await supabase
      .from("affiliates")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", affiliate.id);

    if (updErr) {
      log("balance_reserve_failed_rolling_back", { reqId, error: updErr.message });
      await supabase.from("affiliate_withdrawals").delete().eq("id", withdrawal.id);
      throw updErr;
    }
    log("balance_reserved", { reqId, newBalance });

    // --- Attempt Moolre payout if affiliate has momo details ---
    let payoutResult: any = null;
    let payoutError: string | null = null;
    let payoutRef: string | null = null;

    if (affiliate.momo_number && affiliate.momo_network) {
      log("payout_attempt_start", {
        reqId,
        withdrawal_id: withdrawal.id,
        recipient_number: affiliate.momo_number,
        network: affiliate.momo_network,
        amount: amt,
      });
      try {
        const payoutRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/moolre-payout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            action: "process_payout",
            withdrawal_id: withdrawal.id,
            affiliate_id: affiliate.id,
            amount: amt,
            recipient_number: affiliate.momo_number,
            recipient_name: affiliate.momo_name || "",
            network: affiliate.momo_network,
          }),
        });
        payoutResult = await payoutRes.json();
        log("payout_response", { reqId, status: payoutRes.status, ok: payoutRes.ok, body: payoutResult });

        if (payoutRes.ok && payoutResult.success) {
          payoutRef = payoutResult.external_ref || null;
          await supabase
            .from("affiliate_withdrawals")
            .update({
              status: "paid",
              payout_reference: payoutRef,
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", withdrawal.id);
          log("withdrawal_marked_paid", { reqId, withdrawal_id: withdrawal.id, payoutRef });
        } else {
          payoutError = payoutResult.error || "Payout failed";
          log("payout_failed", { reqId, error: payoutError, details: payoutResult });
          await supabase
            .from("affiliate_withdrawals")
            .update({
              payout_error: payoutError,
              updated_at: new Date().toISOString(),
            })
            .eq("id", withdrawal.id);
        }
      } catch (e) {
        payoutError = (e as Error).message;
        log("payout_exception", { reqId, error: payoutError });
        await supabase
          .from("affiliate_withdrawals")
          .update({
            payout_error: payoutError,
            updated_at: new Date().toISOString(),
          })
          .eq("id", withdrawal.id);
      }
    } else {
      log("payout_skipped_no_momo_details", {
        reqId,
        momo_number: affiliate.momo_number,
        momo_network: affiliate.momo_network,
      });
    }

    log("request_complete", {
      reqId,
      withdrawal_id: withdrawal.id,
      payout_success: !!payoutResult?.success,
      payoutRef,
      payoutError,
    });

    return new Response(
      JSON.stringify({
        withdrawal,
        newBalance,
        payout: payoutResult?.success
          ? { success: true, external_ref: payoutRef, recipient_name: payoutResult.recipient_name }
          : { success: false, error: payoutError || "No momo details — withdrawal pending manual processing" },
        message: payoutResult?.success
          ? "Withdrawal paid out successfully via Moolre."
          : "Withdrawal request submitted. Balance reserved. Payout will be processed manually.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    log("unhandled_error", { reqId, error: (e as Error).message, stack: (e as Error).stack });
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
