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

    const successful = transactions.filter((t) => (t.status || "").toLowerCase() === "success" || (t.status || "").toLowerCase() === "successful");
    const totalSales = successful.reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalCommissions = (totalSales * Number(affiliate.commission_rate || 0)) / 100;

    const { data: withdrawals } = await supabase
      .from("affiliate_withdrawals")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .order("requested_at", { ascending: false });

    const paidOrPending = (withdrawals || []).reduce(
      (s, w) => s + (w.status === "rejected" ? 0 : Number(w.amount || 0)),
      0,
    );
    const availableBalance = Math.max(totalCommissions - paidOrPending, 0);

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
