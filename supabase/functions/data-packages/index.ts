import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = "https://api.datamartgh.shop/api/developer";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] data-packages: Request received`);

  try {
    const url = new URL(req.url);
    const network = url.searchParams.get("network");
    console.log(`[${requestId}] Requested network: ${network}`);

    if (!network) {
      console.error(`[${requestId}] Missing network parameter`);
      return new Response(
        JSON.stringify({ error: "network query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("DATAHUB_API_KEY");
    const apiUrl = `${API_BASE}/data-packages?network=${encodeURIComponent(network)}`;
    console.log(`[${requestId}] Calling: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: { "X-API-Key": apiKey || "" },
    });
    const data = await response.json();
    console.log(`[${requestId}] API response status: ${response.status}, packages count: ${data?.data?.length ?? 0}`);

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${requestId}] Proxy error:`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
