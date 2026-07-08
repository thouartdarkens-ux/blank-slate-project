import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token, momo_number, momo_name } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const number = String(momo_number || "").trim();
    const name = String(momo_name || "").trim();
    if (!/^0\d{9}$/.test(number)) {
      return new Response(
        JSON.stringify({ error: "Enter a valid 10-digit Momo number starting with 0" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (name.length < 2) {
      return new Response(JSON.stringify({ error: "Enter the Momo account name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionKey = token.split(".")[0].toUpperCase();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: affiliate, error: affErr } = await supabase
      .from("affiliates")
      .select("id")
      .eq("source_hook", sessionKey)
      .maybeSingle();

    if (affErr || !affiliate) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await supabase
      .from("affiliates")
      .update({
        momo_number: number,
        momo_name: name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", affiliate.id);

    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({ success: true, momo_number: number, momo_name: name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
