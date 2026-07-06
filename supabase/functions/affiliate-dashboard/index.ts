import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_TABLES = new Set([
  "webhook_transactions",
  "webhook_transactions_user_1",
  "webhook_transactions_user_2",
]);

const isSuccessful = (t: any) =>
  String(t.status || "").toLowerCase() === "success" ||
  String(t.status || "").toLowerCase() === "successful";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

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

    const tableName = affiliate.transactions_table;

    // Fetch a recent slice for display in the transactions table.
    let recentTransactions: any[] = [];
    // Fetch ALL successful transactions to compute accurate totals.
    let allSuccessful: any[] = [];

    if (ALLOWED_TABLES.has(tableName)) {
      const { data: txs } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      recentTransactions = txs || [];

      // Pull every successful transaction (no limit) so totals are exact,
      // not derived from the capped display slice.
      const { data: successTxs } = await supabase
        .from(tableName)
        .select("amount, status")
        .in("status", ["success", "successful", "Success", "Successful"]);
      allSuccessful = (successTxs || []).filter(isSuccessful);
    }

    const commissionRate = Number(affiliate.commission_rate || 0);

    // Total sales = sum of amounts on successful transactions only.
    const totalSales = allSuccessful.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0,
    );

    // Total commission = sales * rate / 100, rounded to 2 decimals.
    const totalCommissions = Math.round((totalSales * commissionRate) / 100 * 100) / 100;

    // Withdrawals: only paid + pending reduce the available balance.
    // Rejected withdrawals do NOT deduct (they were never paid out).
    const { data: withdrawals } = await supabase
      .from("affiliate_withdrawals")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .order("requested_at", { ascending: false });

    const allWithdrawals = withdrawals || [];
    const deducted = allWithdrawals
      .filter((w) => w.status !== "rejected")
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const availableBalance = Math.max(totalCommissions - deducted, 0);

    const { password_hash: _ph, ...profile } = affiliate;

    return new Response(
      JSON.stringify({
        profile,
        transactions: recentTransactions,
        withdrawals: allWithdrawals,
        stats: {
          totalSales,
          totalCommissions,
          availableBalance,
          transactionCount: recentTransactions.length,
          successfulCount: allSuccessful.length,
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
