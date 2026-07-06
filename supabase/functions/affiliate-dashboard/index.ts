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
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const affiliateId = token.split(".")[0];
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: affiliate, error } = await supabase
      .from("affiliates")
      .select("*")
      .eq("id", affiliateId)
      .maybeSingle();

    if (error || !affiliate) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const commissionRate = Number(affiliate.commission_rate || 0);

    const tableName = affiliate.transactions_table;
    let transactions: any[] = [];
    if (ALLOWED_TABLES.has(tableName)) {
      const { data: txs } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      transactions = txs || [];
    }

    // Only count transactions that have a valid amount and a successful status.
    const successful = transactions.filter(
      (t) => isSuccessful(t.status) && Number(t.amount || 0) > 0,
    );

    const totalSales = successful.reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalCommissions = (totalSales * commissionRate) / 100;

    const { data: withdrawals } = await supabase
      .from("affiliate_withdrawals")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .order("requested_at", { ascending: false });

    // Only withdrawals that have been paid out reduce the available balance.
    // Pending requests are shown separately so affiliates can see them, but
    // they are not yet deducted (they may be rejected).
    const paidOut = (withdrawals || [])
      .filter((w) => isPaidOut(w.status))
      .reduce((s, w) => s + Number(w.amount || 0), 0);

    const pendingWithdrawals = (withdrawals || [])
      .filter((w) => w.status === "pending")
      .reduce((s, w) => s + Number(w.amount || 0), 0);

    const availableBalance = Math.max(totalCommissions - paidOut - pendingWithdrawals, 0);

    const { password_hash: _ph, ...profile } = affiliate;

    return new Response(
      JSON.stringify({
        profile,
        transactions,
        withdrawals: withdrawals || [],
        stats: {
          totalSales,
          totalCommissions,
          availableBalance,
          transactionCount: transactions.length,
          pendingWithdrawals,
        },
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
