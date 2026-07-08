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

    // Build the slug suffix: initials + last 4 digits of phone
    const init = initials(full_name);
    const phoneTail = cleanPhone.slice(-4);
    const suffix = `${init}${phoneTail}`;
    const ussdSlug = suffix;
    const webhookSlug = suffix;
    const sourceHook = webhookSlug.toUpperCase();

    // Hash password
    const passwordHash = await sha256(password);

    // Insert the affiliate with source_hook and demo ussd code
    const { data: affiliate, error: affErr } = await supabase
      .from("affiliates")
      .insert({
        username,
        password_hash: passwordHash,
        full_name,
        email: email || null,
        phone: cleanPhone,
        ussd_code: ussd_code || "*920*665#",
        commission_rate: commission_rate ?? 17,
        source_hook: sourceHook,
        balance: 0,
        ussd: "",
        webhook: "",
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

    return new Response(
      JSON.stringify({
        success: true,
        affiliate: { id: affiliate.id, username: affiliate.username, full_name: affiliate.full_name },
        endpoints: {
          ussd_slug: ussdSlug,
          webhook_slug: webhookSlug,
          source_hook: sourceHook,
        },
        note: "Affiliate created.",
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
