import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pairs, error } = await supabase
      .from("nalo_endpoint_pairs")
      .select(`
        id,
        name,
        description,
        ussd_function_name,
        ussd_function_url,
        webhook_function_name,
        webhook_function_url,
        source_hook,
        notification_phone,
        deployment_status,
        is_active,
        is_template,
        affiliate_name,
        created_at,
        affiliates:affiliate_id (
          full_name,
          phone,
          username,
          email,
          ussd_code,
          commission_rate
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (pairs || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      ussd_function_name: p.ussd_function_name,
      ussd_function_url: p.ussd_function_url,
      webhook_function_name: p.webhook_function_name,
      webhook_function_url: p.webhook_function_url,
      source_hook: p.source_hook,
      notification_phone: p.notification_phone,
      deployment_status: p.deployment_status,
      is_active: p.is_active,
      is_template: p.is_template,
      created_at: p.created_at,
      affiliate_name: p.affiliate_name || p.affiliates?.full_name || null,
      affiliate_phone: p.affiliates?.phone || null,
      affiliate_username: p.affiliates?.username || null,
      affiliate_email: p.affiliates?.email || null,
      affiliate_ussd_code: p.affiliates?.ussd_code || null,
      affiliate_commission_rate: p.affiliates?.commission_rate ?? null,
    }));

    return new Response(JSON.stringify({ pairs: rows, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
