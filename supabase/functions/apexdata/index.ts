import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] apexdata: Request received`);

  try {
    const body = await req.json();
    const { phoneNumber, network, capacity, amount, paystackReference, paystackId, retryTransactionId } = body;
    console.log(`[${requestId}] Input:`, JSON.stringify({ phoneNumber, network, capacity, amount, paystackReference, retryTransactionId }));

    if (!phoneNumber || !network || !capacity || !amount) {
      return new Response(
        JSON.stringify({ error: "phoneNumber, network, capacity, and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let txnId: string;

    if (retryTransactionId) {
      console.log(`[${requestId}] Retrying existing transaction: ${retryTransactionId}`);
      const { error: updateError } = await supabase
        .from("data_transactions")
        .update({ status: "pending", error_message: null })
        .eq("id", retryTransactionId);
      if (updateError) throw new Error(`Failed to reset transaction: ${updateError.message}`);
      txnId = retryTransactionId;
    } else {
      console.log(`[${requestId}] Inserting pending transaction...`);
      const { data: txn, error: insertError } = await supabase
        .from("data_transactions")
        .insert({
          phone_number: phoneNumber,
          network,
          capacity: String(capacity),
          amount: Number(amount),
          status: "pending",
          transaction_reference: paystackReference || null,
          paystack_id: paystackId || paystackReference || null,
          processing_method: "apexdata",
        })
        .select()
        .single();

      if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);
      console.log(`[${requestId}] Transaction created: ${txn.id}`);
      txnId = txn.id;
    }

    // Call ApexDataGH API
    const apexAuth = Deno.env.get("APEX_AUTH_TOKEN") || "";
    const encodedAuth = btoa(apexAuth);

    const apexUrl = new URL("https://apexdatagh.com/wp-json/custom/v1/place-order");
    apexUrl.searchParams.set("network", "telecel");
    apexUrl.searchParams.set("recipient", phoneNumber);
    apexUrl.searchParams.set("package_size", String(capacity));
    apexUrl.searchParams.set("order_id", paystackReference || txnId);

    console.log(`[${requestId}] Calling ApexDataGH: ${apexUrl.toString()}`);

    const apexRes = await fetch(apexUrl.toString(), {
      method: "POST",
      headers: {
        "Authorization": `Basic ${apexAuth}`,
      },
    });

    const apexData = await apexRes.json();
    console.log(`[${requestId}] ApexData response (${apexRes.status}):`, JSON.stringify(apexData));

    // Update transaction based on response
    if (apexRes.ok && (apexData.status === "success" || apexData.status === true)) {
      const { error: updateError } = await supabase
        .from("data_transactions")
        .update({
          status: "completed",
          order_reference: apexData.order_id || apexData.reference || null,
          processing_method: "apexdata",
          error_message: null,
        })
        .eq("id", txnId);
      if (updateError) console.error(`[${requestId}] Failed to update to completed:`, updateError.message);
      else console.log(`[${requestId}] Transaction ${txnId} updated to completed`);
    } else {
      const errorMsg = apexData.message || apexData.error || JSON.stringify(apexData);
      console.error(`[${requestId}] ApexData purchase failed: ${errorMsg}`);
      await supabase
        .from("data_transactions")
        .update({ status: "failed", error_message: errorMsg })
        .eq("id", txnId);
    }

    // Send SMS notification
    const rawBundle = `${capacity} GB`;
    const smsMessage = `Dear Client, your payment for (Telecel - ${rawBundle}) was successful and pending delivery. Transaction ID: ${paystackReference || txnId}`;
    const smsApiKey = Deno.env.get("SMS_API_KEY") || "";

    try {
      const smsRes = await fetch("https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": smsApiKey },
        body: JSON.stringify({
          message: smsMessage,
          recipients: [phoneNumber],
          senderId: "MOVAconsult",
          source: "MovaDataHub",
          context: `Telecel-${rawBundle}`,
        }),
      });
      const smsResult = await smsRes.json();
      console.log(`[${requestId}] SMS response:`, JSON.stringify(smsResult));
    } catch (smsError) {
      console.error(`[${requestId}] SMS failed:`, smsError);
    }

    return new Response(JSON.stringify({ success: true, requestId, data: apexData }), {
      status: apexRes.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
