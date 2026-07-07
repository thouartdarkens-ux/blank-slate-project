import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    // Token prefix is the affiliate's source_hook (set at login time)
    const sessionKey = token.split(".")[0];
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: affiliate, error } = await supabase
      .from("affiliates")
      .select("*")
      .eq("source_hook", sessionKey)
      .maybeSingle();

    if (error || !affiliate) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const commissionRate = Number(affiliate.commission_rate || 0);

    const sourceHook = affiliate.source_hook;
    let transactions: any[] = [];
    if (sourceHook) {
      const { data: txs } = await supabase
        .from("webhook_transactions")
        .select("*")
        .eq("source_hook", sourceHook)
        .order("created_at", { ascending: false })
        .limit(200);
      transactions = txs || [];
    }

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

    const paidOut = (withdrawals || [])
      .filter((w) => isPaidOut(w.status))
      .reduce((s, w) => s + Number(w.amount || 0), 0);

    const pendingWithdrawals = (withdrawals || [])
      .filter((w) => (w.status || "").toLowerCase() === "pending")
      .reduce((s, w) => s + Number(w.amount || 0), 0);

    const availableBalance = Math.max(totalCommissions - paidOut - pendingWithdrawals, 0);

    // Keep the stored balance column in sync so it can be referenced elsewhere
    if (Number(affiliate.balance) !== availableBalance) {
      await supabase
        .from("affiliates")
        .update({ balance: availableBalance, updated_at: new Date().toISOString() })
        .eq("id", affiliate.id);
    }

    const { password_hash: _ph, ...profile } = affiliate;
    profile.balance = availableBalance;

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
