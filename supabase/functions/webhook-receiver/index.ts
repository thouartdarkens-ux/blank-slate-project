import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const networkMap: Record<string, string> = {
  MTN: "YELLO",
  Telecel: "TELECEL",
  AT: "AT_PREMIUM",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] ===== WEBHOOK RECEIVED =====`);

  try {
    const body = await req.json();
    console.log(`[${requestId}] Event: ${body.event}`);

    if (body.event !== "charge.success") {
      console.log(`[${requestId}] Ignoring non-success event`);
      return new Response(JSON.stringify({ success: true, message: "Event ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = body.data;
    const amount = data.amount / 100;
    const paystackReference = data.reference || "";
    const customFields = data.metadata?.custom_fields || [];

    const getField = (varName: string) =>
      customFields.find((f: any) => f.variable_name === varName)?.value || "";

    const phoneNumber = getField("phone");
    const rawBundle = getField("bundle"); // e.g. "2 GB"
    const rawNetwork = getField("network"); // e.g. "MTN"

    // Parse bundle: remove "GB" and trim
    const capacity = rawBundle.replace(/\s*GB\s*/gi, "").trim();

    // Map network
    const network = networkMap[rawNetwork] || rawNetwork.toUpperCase();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Check manual processing mode
    const sbClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: manualSettings } = await sbClient
      .from("manual_processing_settings")
      .select("is_active, admin_phone")
      .limit(1)
      .maybeSingle();

    const isManualMode = manualSettings?.is_active === true && manualSettings?.admin_phone;

    if (isManualMode) {
      console.log(`[${requestId}] Manual processing mode is ON. Recording transaction without calling provider.`);

      // Record the transaction as pending
      const { error: insertError } = await sbClient
        .from("data_transactions")
        .insert({
          phone_number: phoneNumber,
          network,
          capacity,
          amount,
          paystack_id: paystackReference,
          status: "pending",
          processing_method: "manual",
          error_message: "Awaiting manual processing",
        });

      if (insertError) {
        console.error(`[${requestId}] Failed to insert transaction:`, insertError);
      }

      // Send SMS to customer
      const smsApiKey = Deno.env.get("SMS_API_KEY") || "";
      const customerMessage = `Dear Client, your payment for (${rawNetwork} - ${rawBundle}) was successful and pending delivery. Transaction ref: ${paystackReference}`;

      try {
        const custSmsRes = await fetch("https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": smsApiKey },
          body: JSON.stringify({
            message: customerMessage,
            recipients: [phoneNumber],
            senderId: "MOVAconsult",
            source: "MovaDataHub",
            context: `${rawNetwork}-${rawBundle}`,
          }),
        });
        const custSmsResult = await custSmsRes.json();
        console.log(`[${requestId}] Customer SMS response (${custSmsRes.status}):`, JSON.stringify(custSmsResult));
      } catch (e) {
        console.error(`[${requestId}] Customer SMS failed:`, e);
      }

      // Send SMS to admin
      const adminMessage = `${rawNetwork} ${rawBundle} for ${phoneNumber}. Amount: GH₵${amount}. Ref: ${paystackReference}.`;
      try {
        const adminSmsRes = await fetch("https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": smsApiKey },
          body: JSON.stringify({
            message: adminMessage,
            recipients: [manualSettings.admin_phone],
            senderId: "MOVAconsult",
            source: "MovaDataHub",
            context: `manual-${rawNetwork}-${rawBundle}`,
          }),
        });
        const adminSmsResult = await adminSmsRes.json();
        console.log(`[${requestId}] Admin SMS response (${adminSmsRes.status}):`, JSON.stringify(adminSmsResult));
      } catch (e) {
        console.error(`[${requestId}] Admin SMS failed:`, e);
      }

      return new Response(JSON.stringify({ success: true, requestId, mode: "manual" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normal auto-processing flow
    const purchasePayload = { phoneNumber, network, capacity, amount, paystackReference, paystackId: paystackReference };

    const isTelecel = rawNetwork.toLowerCase() === "telecel";
    const targetFunction = isTelecel ? "apexdata" : "purchase-data";

    console.log(`[${requestId}] Routing to ${targetFunction} with:`, JSON.stringify(purchasePayload));

    const purchaseRes = await fetch(`${supabaseUrl}/functions/v1/${targetFunction}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(purchasePayload),
    });

    const purchaseResult = await purchaseRes.json();
    console.log(`[${requestId}] ${targetFunction} response (${purchaseRes.status}):`, JSON.stringify(purchaseResult));

    // Send SMS notification (skip for Telecel — apexdata handles its own SMS)
    if (!isTelecel) {
      const transactionId = paystackReference || purchaseResult?.data?.purchaseId || requestId;
      const smsMessage = `Dear Client, your payment for (${rawNetwork} - ${rawBundle}) was successful and pending delivery. You can check delivery status using transaction ID ${transactionId}`;
      console.log(`[${requestId}] Sending SMS to ${phoneNumber}: ${smsMessage}`);

      const smsApiKey = Deno.env.get("SMS_API_KEY") || "";
      try {
        const smsRes = await fetch("https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/send-sms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": smsApiKey,
          },
          body: JSON.stringify({
            message: smsMessage,
            recipients: [phoneNumber],
            senderId: "MOVAconsult",
            source: "MovaDataHub",
            context: `${rawNetwork}-${rawBundle}`,
          }),
        });
        const smsResult = await smsRes.json();
        console.log(`[${requestId}] SMS response (${smsRes.status}):`, JSON.stringify(smsResult));
      } catch (smsError) {
        console.error(`[${requestId}] SMS sending failed:`, smsError);
      }
    }

    return new Response(JSON.stringify({ success: true, requestId, purchaseResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
