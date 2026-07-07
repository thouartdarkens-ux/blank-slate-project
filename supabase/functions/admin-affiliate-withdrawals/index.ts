import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_FIELDS = [
  "affiliate_id",
  "amount",
  "status",
  "notes",
  "momo_number",
  "momo_name",
  "processed_at",
];

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

    if (action === "insert") {
      if (!payload.affiliate_id || !payload.amount) {
        return new Response(JSON.stringify({ error: "affiliate_id and amount required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!payload.status) payload.status = "pending";
      const { data: row, error } = await supabase
        .from("affiliate_withdrawals")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ withdrawal: row }), {
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
      // Auto-stamp processed_at when moving out of pending
      if (payload.status && payload.status !== "pending" && !payload.processed_at) {
        payload.processed_at = new Date().toISOString();
      }
      payload.updated_at = new Date().toISOString();
      const { data: row, error } = await supabase
        .from("affiliate_withdrawals")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ withdrawal: row }), {
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
