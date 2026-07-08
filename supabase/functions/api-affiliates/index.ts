import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_FIELDS = [
  "username",
  "full_name",
  "email",
  "phone",
  "ussd_code",
  "commission_rate",
  "balance",
  "momo_number",
  "momo_name",
  "source_hook",
  "lifetime_commissions",
  "sales_quantity",
  "sales_amount",
];

function pick(obj: Record<string, any>, fields: string[]) {
  const out: Record<string, any> = {};
  for (const f of fields) if (obj[f] !== undefined) out[f] = obj[f];
  return out;
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ── GET: retrieve affiliates ────────────────────────────────
    if (req.method === "GET") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      const username = url.searchParams.get("username");
      const limit = parseInt(url.searchParams.get("limit") || "100", 10);
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const offset = (page - 1) * limit;

      // Single affiliate by id
      if (id) {
        const { data, error } = await supabase
          .from("affiliates")
          .select("id, username, full_name, email, phone, ussd_code, commission_rate, balance, momo_number, momo_name, source_hook, lifetime_commissions, sales_quantity, sales_amount, created_at, updated_at")
          .eq("id", id)
          .single();

        if (error) {
          if (error.code === "PGRP1161") return json({ error: "Affiliate not found" }, 404);
          throw error;
        }
        return json({ affiliate: data });
      }

      // Single affiliate by username
      if (username) {
        const { data, error } = await supabase
          .from("affiliates")
          .select("id, username, full_name, email, phone, ussd_code, commission_rate, balance, momo_number, momo_name, source_hook, lifetime_commissions, sales_quantity, sales_amount, created_at, updated_at")
          .eq("username", username)
          .single();

        if (error) {
          if (error.code === "PGRP1161") return json({ error: "Affiliate not found" }, 404);
          throw error;
        }
        return json({ affiliate: data });
      }

      // List all affiliates
      const { data, error, count } = await supabase
        .from("affiliates")
        .select("id, username, full_name, email, phone, ussd_code, commission_rate, balance, momo_number, momo_name, source_hook, lifetime_commissions, sales_quantity, sales_amount, created_at, updated_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return json({
        affiliates: data,
        total: count,
        page,
        limit,
      });
    }

    // ── PATCH: update an affiliate ──────────────────────────────
    if (req.method === "PATCH") {
      const body = await req.json();
      const { id, ...rest } = body;

      if (!id) return json({ error: "id is required" }, 400);

      const payload = pick(rest, ALLOWED_FIELDS);
      if (typeof payload.source_hook === "string") payload.source_hook = payload.source_hook.toUpperCase();
      if (Object.keys(payload).length === 0) {
        return json({ error: "No valid fields to update" }, 400);
      }

      const { data, error } = await supabase
        .from("affiliates")
        .update(payload)
        .eq("id", id)
        .select("id, username, full_name, email, phone, ussd_code, commission_rate, balance, momo_number, momo_name, source_hook, lifetime_commissions, sales_quantity, sales_amount, created_at, updated_at")
        .single();

      if (error) {
        if (error.code === "PGRP1161") return json({ error: "Affiliate not found" }, 404);
        throw error;
      }

      return json({ affiliate: data });
    }

    return json({ error: "Method not allowed. Use GET or PATCH." }, 405);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
