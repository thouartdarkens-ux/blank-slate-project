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
  console.log(`[${requestId}] check-balance-alert: Request received`);

  try {
    const { balance } = await req.json();
    console.log(`[${requestId}] Current balance: ${balance}`);

    if (typeof balance !== "number") {
      return new Response(JSON.stringify({ error: "balance is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get active alert config
    const { data: alerts, error: alertError } = await supabase
      .from("balance_alerts")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (alertError || !alerts) {
      console.log(`[${requestId}] No active alert config found`);
      return new Response(JSON.stringify({ alertTriggered: false, reason: "no_config" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${requestId}] Alert config: threshold=${alerts.threshold}, phones=${alerts.phone_numbers}`);

    // Check if balance is below threshold
    if (balance >= alerts.threshold) {
      console.log(`[${requestId}] Balance ${balance} >= threshold ${alerts.threshold}, no alert needed`);
      return new Response(JSON.stringify({ alertTriggered: false, reason: "above_threshold" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cooldown: don't send more than once per hour
    if (alerts.last_alert_sent_at) {
      const lastSent = new Date(alerts.last_alert_sent_at).getTime();
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - lastSent < oneHour) {
        console.log(`[${requestId}] Alert cooldown active, last sent: ${alerts.last_alert_sent_at}`);
        return new Response(JSON.stringify({ alertTriggered: false, reason: "cooldown" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Send SMS to all configured phone numbers
    const phoneNumbers: string[] = alerts.phone_numbers || [];
    if (phoneNumbers.length === 0) {
      console.log(`[${requestId}] No phone numbers configured`);
      return new Response(JSON.stringify({ alertTriggered: false, reason: "no_phones" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const smsApiKey = Deno.env.get("SMS_API_KEY") || "";
    const smsMessage = `⚠️ LOW BALANCE ALERT: Your data balance has dropped to GH₵ ${balance.toFixed(2)}, which is below your threshold of GH₵ ${alerts.threshold}. Please top up immediately. - MOVAconsult`;

    console.log(`[${requestId}] Sending alert SMS to ${phoneNumbers.length} recipient(s): ${phoneNumbers.join(", ")}`);

    try {
      const smsRes = await fetch("https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": smsApiKey,
        },
        body: JSON.stringify({
          message: smsMessage,
          recipients: phoneNumbers,
          senderId: "MOVAconsult",
          source: "BalanceAlert",
          context: `balance-${balance}`,
        }),
      });
      const smsResult = await smsRes.json();
      console.log(`[${requestId}] SMS response (${smsRes.status}):`, JSON.stringify(smsResult));
    } catch (smsError) {
      console.error(`[${requestId}] SMS sending failed:`, smsError);
    }

    // Update last_alert_sent_at
    await supabase
      .from("balance_alerts")
      .update({ last_alert_sent_at: new Date().toISOString() })
      .eq("id", alerts.id);

    console.log(`[${requestId}] Alert sent and timestamp updated`);

    return new Response(JSON.stringify({ alertTriggered: true, balance, threshold: alerts.threshold }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
