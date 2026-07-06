import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const reqId = crypto.randomUUID().slice(0, 8);
  console.log(`[${reqId}] available-bundles: request received`);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("bundle_prices")
      .select("network, capacity, mb, selling_price, cost_price")
      .gt("selling_price", 0)
      .order("selling_price", { ascending: true });

    if (error) {
      console.error(`[${reqId}] DB error:`, error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter where selling_price > cost_price
    const profitable = (data ?? []).filter(
      (b) => Number(b.selling_price) > Number(b.cost_price)
    );

    console.log(`[${reqId}] Total rows: ${data?.length}, profitable: ${profitable.length}`);

    // Map network codes to friendly names
    const networkLabels: Record<string, string> = {
      YELLO: "MTN",
      TELECEL: "Telecel",
      AT_PREMIUM: "AT",
    };

    // Group by network
    const grouped: Record<string, { size: string; amount: number }[]> = {};

    for (const b of profitable) {
      const label = networkLabels[b.network] ?? b.network;
      if (!grouped[label]) grouped[label] = [];

      const mb = parseInt(b.mb);
      const size = mb >= 1000
        ? `${(mb / 1000).toFixed(mb % 1000 === 0 ? 0 : 1)} GB`
        : `${mb} MB`;

      grouped[label].push({ size, amount: Number(b.selling_price) });
    }

    console.log(`[${reqId}] Networks: ${Object.keys(grouped).join(", ")}`);

    return new Response(JSON.stringify({ data: grouped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[${reqId}] Unexpected error:`, err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
