import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_FIELDS = [
  "username",
  "full_name",
  "email",
  "phone",
  "ussd_code",
  "commission_rate",
  "source_hook",
  "balance",
  "momo_number",
  "momo_name",
];

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function pick(obj: any, fields: string[]) {
  const out: Record<string, any> = {};
  for (const f of fields) if (obj[f] !== undefined) out[f] = obj[f];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const adminKey = req.headers.get("x-admin-key") || "";
    if (adminKey !== Deno.env.get("ADMIN_API_KEY")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, id, data } = await req.json();
    if (!action || !data) {
      return new Response(JSON.stringify({ error: "action and data required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payload = pick(data, ALLOWED_FIELDS);
    if (data.password) payload.password_hash = await sha256(String(data.password));

    if (action === "insert") {
      if (!payload.username || !payload.full_name || !payload.source_hook || !payload.password_hash) {
        return new Response(
          JSON.stringify({ error: "username, full_name, source_hook and password required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { data: row, error } = await supabase.from("affiliates").insert(payload).select().single();
      if (error) throw error;
      const { password_hash: _p, ...safe } = row;
      return new Response(JSON.stringify({ affiliate: safe }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      if (!id) {
        return new Response(JSON.stringify({ error: "id required for update" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      payload.updated_at = new Date().toISOString();
      const { data: row, error } = await supabase
        .from("affiliates")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      const { password_hash: _p, ...safe } = row;
      return new Response(JSON.stringify({ affiliate: safe }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
