import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { new_password, affiliate_id, username, phone } = body;

    if (!new_password || typeof new_password !== "string" || new_password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const passwordHash = await sha256(new_password);

    // Mode 1: Admin reset — requires x-admin-key + affiliate_id
    if (affiliate_id) {
      const adminKey = req.headers.get("x-admin-key") || "";
      if (adminKey !== Deno.env.get("ADMIN_API_KEY")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updated, error } = await supabase
        .from("affiliates")
        .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
        .eq("id", affiliate_id)
        .select("id, username, full_name")
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return new Response(JSON.stringify({ error: "Affiliate not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw error;
      }

      return new Response(JSON.stringify({ success: true, affiliate: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: Self-service reset — verify username + phone match
    if (!username || !phone) {
      return new Response(JSON.stringify({ error: "username and phone are required for self-service reset" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: affiliate, error: lookupErr } = await supabase
      .from("affiliates")
      .select("id, username, phone")
      .eq("username", username)
      .maybeSingle();

    if (lookupErr) {
      return new Response(JSON.stringify({ error: "Network error", code: "NETWORK_ERROR" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!affiliate) {
      return new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify phone matches
    const cleanPhone = (phone as string).replace(/\D/g, "");
    const storedPhone = (affiliate.phone || "").replace(/\D/g, "");
    if (cleanPhone !== storedPhone) {
      return new Response(JSON.stringify({ error: "Phone number does not match our records" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateErr } = await supabase
      .from("affiliates")
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq("id", affiliate.id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, username: affiliate.username }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
