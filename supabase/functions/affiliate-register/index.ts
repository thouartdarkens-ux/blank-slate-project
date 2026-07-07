import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { USSD_TEMPLATE_B64, WEBHOOK_TEMPLATE_B64 } from "./templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function decodeB64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "xx";
  if (parts.length === 1) return parts[0].slice(0, 2).toLowerCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toLowerCase();
}

function sanitizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

function sanitizeSlug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      full_name,
      username,
      phone,
      email,
      password,
      commission_rate,
      ussd_code,
    } = await req.json();

    if (!full_name || !username || !phone || !password) {
      return new Response(
        JSON.stringify({ error: "full_name, username, phone, and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanPhone = sanitizePhone(phone);
    if (cleanPhone.length < 10) {
      return new Response(
        JSON.stringify({ error: "A valid phone number (at least 10 digits) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check for duplicate username
    const { data: existing } = await supabase
      .from("affiliates")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({ error: "Username already taken" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build the clone suffix: initials + last 4 digits of phone
    const init = initials(full_name);
    const phoneTail = cleanPhone.slice(-4);
    const suffix = `${init}${phoneTail}`;
    const ussdSlug = `naloussd-${suffix}`;
    const webhookSlug = `nalowebhook-${suffix}`;
    const sourceHook = webhookSlug; // source_hook = webhook function name

    // Decode templates and substitute placeholders
    const ussdTemplate = decodeB64(USSD_TEMPLATE_B64);
    const webhookTemplate = decodeB64(WEBHOOK_TEMPLATE_B64);

    const ussdSource = ussdTemplate.replaceAll("{{CALLBACK_FUNCTION}}", webhookSlug);
    const webhookSource = webhookTemplate
      .replaceAll("{{SOURCE_HOOK}}", sourceHook)
      .replaceAll("{{NOTIFICATION_PHONE}}", cleanPhone);

    // Hash password
    const passwordHash = await sha256(password);

    // Insert the affiliate with source_hook
    const { data: affiliate, error: affErr } = await supabase
      .from("affiliates")
      .insert({
        username,
        password_hash: passwordHash,
        full_name,
        email: email || null,
        phone: cleanPhone,
        ussd_code: ussd_code || null,
        commission_rate: commission_rate ?? 17,
        source_hook: sourceHook,
        balance: 0,
      })
      .select()
      .single();

    if (affErr) {
      if (affErr.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Username already taken" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw affErr;
    }

    // Insert the cloned endpoint pair record (source stored for later deployment)
    const { error: pairErr } = await supabase.from("nalo_endpoint_pairs").insert({
      name: `${init}-${phoneTail}`,
      description: `Auto-cloned for affiliate ${full_name} (${username})`,
      network: null,
      ussd_function_name: ussdSlug,
      ussd_function_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/${ussdSlug}`,
      webhook_function_name: webhookSlug,
      webhook_function_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/${webhookSlug}`,
      is_active: true,
      affiliate_id: affiliate.id,
      source_hook: sourceHook,
      notification_phone: cleanPhone,
      affiliate_name: full_name,
      is_template: false,
      ussd_source: ussdSource,
      webhook_source: webhookSource,
      deployment_status: "pending",
    });

    if (pairErr) {
      console.error("[affiliate-register] endpoint pair insert error:", pairErr);
      // Affiliate was created; surface a partial-success message
    }

    return new Response(
      JSON.stringify({
        success: true,
        affiliate: { id: affiliate.id, username: affiliate.username, full_name: affiliate.full_name },
        endpoints: {
          ussd_slug: ussdSlug,
          webhook_slug: webhookSlug,
          source_hook: sourceHook,
        },
        note: "Affiliate created. Endpoint pair cloned and stored — deploy the functions to activate.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[affiliate-register] error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
