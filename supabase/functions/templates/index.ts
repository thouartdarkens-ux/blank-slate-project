import { USSD_TEMPLATE_B64, WEBHOOK_TEMPLATE_B64 } from "./templates.module.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeB64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const name = url.searchParams.get("name");

  const templates: Record<string, string> = {
    naloussd: decodeB64(USSD_TEMPLATE_B64),
    nalowebhook: decodeB64(WEBHOOK_TEMPLATE_B64),
  };

  if (name) {
    const source = templates[name];
    if (!source) {
      return new Response(JSON.stringify({ error: `Unknown template: ${name}` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ name, source }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ templates: Object.keys(templates) }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
