import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_TABLES = new Set([
  "webhook_transactions",
  "webhook_transactions_user_1",
  "webhook_transactions_user_2",
]);

const isSuccessful = (status: string) =>
  /^(success|successful|completed|paid)$/i.test((status || "").trim());

const isPaidOut = (status: string) =>
  /^(paid|completed|approved)$/i.test((status || "").trim());

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token, amount, notes } = await req.json();
    const amt = Number(amount);
    if (!token || !amt || amt <= 0) {
      return new Response(
        JSON.stringify({ error: "token and positive amount required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const affiliateId = token.split(".")[0];
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: affiliate, error: affErr } = await supabase
      .from("affiliates")
      .select("id, commission_rate, transactions_table, balance, momo_number, momo_name")
      .eq("id", affiliateId)
      .maybeSingle();

    if (affErr || !affiliate) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Recompute available balance server-side ---
    const commissionRate = Number(affiliate.commission_rate || 0);
    let transactions: any[] = [];
    if (ALLOWED_TABLES.has(affiliate.transactions_table)) {
      const { data: txs } = await supabase
        .from(affiliate.transactions_table)
        .select("amount,status")
        .limit(2000);
      transactions = txs || [];
    }
    const totalSales = transactions
      .filter((t) => isSuccessful(t.status) && Number(t.amount || 0) > 0)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalCommissions = (totalSales * commissionRate) / 100;

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

    if (amt > availableBalance) {
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

    if (insErr) throw insErr;

    // --- Update stored balance column on affiliates (reserve the amount) ---
    const newBalance = Math.max(availableBalance - amt, 0);
    const { error: updErr } = await supabase
      .from("affiliates")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", affiliate.id);

    if (updErr) {
      // Roll back the withdrawal row so state stays consistent
      await supabase.from("affiliate_withdrawals").delete().eq("id", withdrawal.id);
      throw updErr;
    }

    return new Response(
      JSON.stringify({
        withdrawal,
        newBalance,
        message: "Withdrawal request submitted. Balance reserved.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
