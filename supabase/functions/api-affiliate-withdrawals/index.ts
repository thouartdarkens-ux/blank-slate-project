import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
    // ── GET: retrieve withdrawals ──────────────────────────────
    if (req.method === "GET") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      const affiliateId = url.searchParams.get("affiliate_id");
      const status = url.searchParams.get("status");
      const limit = parseInt(url.searchParams.get("limit") || "100", 10);
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const offset = (page - 1) * limit;

      // Single withdrawal by id
      if (id) {
        const { data, error } = await supabase
          .from("affiliate_withdrawals")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          if (error.code === "PGRP1161") return json({ error: "Withdrawal not found" }, 404);
          throw error;
        }
        return json({ withdrawal: data });
      }

      // List with optional filters
      let query = supabase
        .from("affiliate_withdrawals")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (affiliateId) query = query.eq("affiliate_id", affiliateId);
      if (status) query = query.eq("status", status);

      const { data, error, count } = await query;
      if (error) throw error;

      return json({
        withdrawals: data,
        total: count,
        page,
        limit,
      });
    }

    // ── PATCH: update a withdrawal ──────────────────────────────
    if (req.method === "PATCH") {
      const body = await req.json();
      const { id, ...rest } = body;

      if (!id) return json({ error: "id is required" }, 400);

      const payload = pick(rest, ALLOWED_FIELDS);
      if (Object.keys(payload).length === 0) {
        return json({ error: "No valid fields to update" }, 400);
      }

      // Auto-stamp processed_at when status moves away from pending
      if (payload.status && payload.status !== "pending" && !payload.processed_at) {
        payload.processed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("affiliate_withdrawals")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRP1161") return json({ error: "Withdrawal not found" }, 404);
        throw error;
      }

      return json({ withdrawal: data });
    }

    return json({ error: "Method not allowed. Use GET or PATCH." }, 405);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
