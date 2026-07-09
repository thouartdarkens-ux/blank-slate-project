import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return new Response(JSON.stringify({ error: "username and password required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: affiliate, error } = await supabase
      .from("affiliates")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    // Network/connection errors should be distinguishable from bad credentials
    // so the frontend can show "Failed to login, retry" vs "Invalid credentials".
    if (error) {
      return new Response(
        JSON.stringify({ error: "Network error", code: "NETWORK_ERROR" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!affiliate) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hash = await sha256(password);
    if (hash !== affiliate.password_hash) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Session token = source_hook + random suffix (stored in localStorage).
    // The dashboard/withdraw functions look up the affiliate by source_hook.
    const sessionKey = affiliate.source_hook || affiliate.id;
    const token = `${sessionKey}.${crypto.randomUUID()}`;
    const { password_hash: _ph, ...profile } = affiliate;

    return new Response(JSON.stringify({ token, affiliate: profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    // Unexpected errors (network, timeout, etc.) — return NETWORK_ERROR so
    // the frontend can show "Failed to login, retry" instead of "Invalid credentials".
    return new Response(
      JSON.stringify({ error: "Network error", code: "NETWORK_ERROR" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
