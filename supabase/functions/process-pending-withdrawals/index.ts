import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const log = (stage: string, data: any = {}) => {
  try {
    console.log(`[process-pending-withdrawals] ${stage}`, JSON.stringify(data));
  } catch {
    console.log(`[process-pending-withdrawals] ${stage}`, data);
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action !== "process") {
      return new Response(
        JSON.stringify({ error: 'Action "process" required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch all pending withdrawals that have momo details
    const { data: pending, error: fetchErr } = await supabase
      .from("affiliate_withdrawals")
      .select("id, affiliate_id, amount, momo_number, momo_name, notes")
      .eq("status", "pending")
      .not("momo_number", "is", null)
      .not("momo_name", "is", null)
      .order("requested_at", { ascending: true });

    if (fetchErr) throw fetchErr;

    log("pending_fetched", { count: pending?.length || 0 });

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending withdrawals to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch affiliate momo_network for each withdrawal
    const affiliateIds = [...new Set(pending.map((w) => w.affiliate_id))];
    const { data: affiliates, error: affErr } = await supabase
      .from("affiliates")
      .select("id, momo_network, commission_rate, source_hook, balance")
      .in("id", affiliateIds);

    if (affErr) throw affErr;

    const affMap = new Map((affiliates || []).map((a) => [a.id, a]));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const results: any[] = [];

    for (const withdrawal of pending) {
      const affiliate = affMap.get(withdrawal.affiliate_id);
      if (!affiliate || !affiliate.momo_network) {
        log("skipping_no_network", { withdrawal_id: withdrawal.id });
        results.push({
          withdrawal_id: withdrawal.id,
          status: "skipped",
          reason: "No momo network on affiliate",
        });
        continue;
      }

      log("processing", {
        withdrawal_id: withdrawal.id,
        amount: withdrawal.amount,
        recipient: withdrawal.momo_number,
        network: affiliate.momo_network,
      });

      try {
        const payoutRes = await fetch(`${supabaseUrl}/functions/v1/moolre-payout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            action: "process_payout",
            withdrawal_id: withdrawal.id,
            affiliate_id: withdrawal.affiliate_id,
            amount: withdrawal.amount,
            recipient_number: withdrawal.momo_number,
            recipient_name: withdrawal.momo_name,
            network: affiliate.momo_network,
          }),
        });

        const payoutData = await payoutRes.json();
        log("payout_result", {
          withdrawal_id: withdrawal.id,
          ok: payoutRes.ok,
          success: payoutData?.success,
          error: payoutData?.error,
        });

        results.push({
          withdrawal_id: withdrawal.id,
          status: payoutData?.success ? "paid" : "pending",
          details: payoutData?.success
            ? { external_ref: payoutData.external_ref, recipient_name: payoutData.recipient_name }
            : { error: payoutData?.error || "Payout did not succeed" },
        });
      } catch (e) {
        log("payout_exception", { withdrawal_id: withdrawal.id, error: (e as Error).message });
        results.push({
          withdrawal_id: withdrawal.id,
          status: "pending",
          error: (e as Error).message,
        });
      }
    }

    const paid = results.filter((r) => r.status === "paid").length;
    const stillPending = results.filter((r) => r.status === "pending").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    log("batch_complete", { paid, stillPending, skipped, total: results.length });

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        paid,
        pending: stillPending,
        skipped,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    log("unhandled_error", { error: (e as Error).message, stack: (e as Error).stack });
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
