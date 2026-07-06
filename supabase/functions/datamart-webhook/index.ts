import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-datamart-signature, x-datamart-event",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] ===== DATAMART WEBHOOK RECEIVED =====`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);
  console.log(`[${requestId}] Headers:`, JSON.stringify(Object.fromEntries(req.headers.entries())));

  try {
    const rawBody = await req.text();
    console.log(`[${requestId}] Raw body: ${rawBody}`);

    const body = JSON.parse(rawBody);
    console.log(`[${requestId}] Parsed body:`, JSON.stringify(body));

    const { event, data } = body;
    console.log(`[${requestId}] Event: ${event}`);
    console.log(`[${requestId}] Data:`, JSON.stringify(data));
    console.log(`[${requestId}] OrderRef: ${data?.orderReference}, OrderId: ${data?.orderId}, Status: ${data?.status}`);
    console.log(`[${requestId}] Phone: ${data?.phone}, Capacity: ${data?.capacity}`);
    console.log(`[${requestId}] DeliveryInfo: ${data?.deliveryInfo}`);
    console.log(`[${requestId}] TrackingId: ${data?.trackingId}`);

    const status = data?.status?.toLowerCase();
    const orderReference = data?.orderReference;
    console.log(`[${requestId}] Mapped status: ${status}, orderReference: ${orderReference}`);

    if (!orderReference) {
      console.log(`[${requestId}] Missing orderReference — returning 400`);
      return new Response(JSON.stringify({ error: "Missing orderReference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${requestId}] Creating Supabase client...`);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const updatePayload: Record<string, unknown> = { status: status || "completed" };
    if (data?.deliveryInfo) updatePayload.error_message = data.deliveryInfo;
    console.log(`[${requestId}] Update payload:`, JSON.stringify(updatePayload));

    console.log(`[${requestId}] Updating data_transactions where order_reference = ${orderReference}...`);
    const { data: updated, error } = await supabase
      .from("data_transactions")
      .update(updatePayload)
      .eq("order_reference", orderReference)
      .select();

    if (error) {
      console.error(`[${requestId}] Supabase update error:`, JSON.stringify(error));
      throw error;
    }

    console.log(`[${requestId}] Updated ${updated?.length || 0} row(s)`);
    console.log(`[${requestId}] Updated rows:`, JSON.stringify(updated));

    return new Response(JSON.stringify({ received: true, updated: updated?.length || 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
