import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    return json({ error: "Method not allowed. Use GET." }, 405);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
