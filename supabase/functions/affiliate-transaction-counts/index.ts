import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const isSuccessful = (status: string) =>
  /^(success|successful|completed|paid)$/i.test((status || "").trim());

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let sourceHook: string | null = url.searchParams.get("source_hook");
    if (sourceHook) sourceHook = sourceHook.toUpperCase();
    let onlySuccessful = url.searchParams.get("successful_only") === "true";

    if (!sourceHook && (req.method === "POST")) {
      try {
        const body = await req.json();
        sourceHook = body?.source_hook ?? null;
        if (sourceHook) sourceHook = sourceHook.toUpperCase();
        if (typeof body?.successful_only === "boolean") {
          onlySuccessful = body.successful_only;
        }
        // support passing an affiliate dashboard token (prefix = source_hook)
        if (!sourceHook && typeof body?.token === "string") {
          sourceHook = body.token.split(".")[0].toUpperCase();
        }
      } catch {
        // no body
      }
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startIso = startOfDay.toISOString();

    // Single-affiliate lookup
    if (sourceHook) {
      const totalQ = supabase
        .from("webhook_transactions")
        .select("id, status", { count: "exact", head: false })
        .eq("source_hook", sourceHook);
      const dailyQ = supabase
        .from("webhook_transactions")
        .select("id, status", { count: "exact", head: false })
        .eq("source_hook", sourceHook)
        .gte("created_at", startIso);

      const [totalRes, dailyRes] = await Promise.all([totalQ, dailyQ]);

      if (totalRes.error) throw totalRes.error;
      if (dailyRes.error) throw dailyRes.error;

      const totalRows = totalRes.data || [];
      const dailyRows = dailyRes.data || [];
      const totalSuccessful = totalRows.filter((r) => isSuccessful(r.status)).length;
      const dailySuccessful = dailyRows.filter((r) => isSuccessful(r.status)).length;

      return new Response(
        JSON.stringify({
          source_hook: sourceHook,
          total_count: onlySuccessful ? totalSuccessful : (totalRes.count ?? totalRows.length),
          daily_count: onlySuccessful ? dailySuccessful : (dailyRes.count ?? dailyRows.length),
          total_successful: totalSuccessful,
          daily_successful: dailySuccessful,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // All affiliates aggregate
    const { data: affiliates, error: affErr } = await supabase
      .from("affiliates")
      .select("id, username, full_name, source_hook")
      .not("source_hook", "is", null);
    if (affErr) throw affErr;

    const hooks = (affiliates || []).map((a) => a.source_hook).filter(Boolean);

    const [totalRes, dailyRes] = await Promise.all([
      supabase
        .from("webhook_transactions")
        .select("source_hook, status")
        .in("source_hook", hooks),
      supabase
        .from("webhook_transactions")
        .select("source_hook, status")
        .in("source_hook", hooks)
        .gte("created_at", startIso),
    ]);

    if (totalRes.error) throw totalRes.error;
    if (dailyRes.error) throw dailyRes.error;

    const tally = (rows: any[]) => {
      const map: Record<string, { total: number; successful: number }> = {};
      for (const r of rows) {
        const k = r.source_hook;
        if (!k) continue;
        if (!map[k]) map[k] = { total: 0, successful: 0 };
        map[k].total += 1;
        if (isSuccessful(r.status)) map[k].successful += 1;
      }
      return map;
    };

    const totalMap = tally(totalRes.data || []);
    const dailyMap = tally(dailyRes.data || []);

    const results = (affiliates || []).map((a) => {
      const t = totalMap[a.source_hook!] || { total: 0, successful: 0 };
      const d = dailyMap[a.source_hook!] || { total: 0, successful: 0 };
      return {
        affiliate_id: a.id,
        username: a.username,
        full_name: a.full_name,
        source_hook: a.source_hook,
        total_count: t.total,
        total_successful: t.successful,
        daily_count: d.total,
        daily_successful: d.successful,
      };
    });

    return new Response(
      JSON.stringify({ count: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
