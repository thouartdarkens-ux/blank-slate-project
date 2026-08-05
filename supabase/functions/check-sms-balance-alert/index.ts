
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { supabaseClient } from "../_shared/supabase-client.ts"
import { sendSMS } from "../_shared/sms-client.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // First, get the threshold settings
    const { data: thresholdData, error: thresholdError } = await supabaseClient
      .from("alert_settings")
      .select("*")
      .eq("type", "sms_balance")
      .single();

    if (thresholdError || !thresholdData) {
      console.log("No SMS balance threshold set or error:", thresholdError);
      return new Response(
        JSON.stringify({ success: false, error: "No SMS balance threshold set" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const threshold = thresholdData.threshold;
    
    // Get SMS notification settings
    const { data: notificationData, error: notificationError } = await supabaseClient
      .from("notification_settings")
      .select("*") 
      .eq("type", "sms_alerts")
      .single();
      
    if (notificationError || !notificationData || !notificationData.enabled) {
      console.log("No SMS notification settings or error:", notificationError);
      return new Response(
        JSON.stringify({ success: false, error: "SMS notifications not configured" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const phoneNumber = notificationData.phone_number;

    // Check current SMS balance
    const apiKey = Deno.env.get('ARKESEL_API_KEY')
    if (!apiKey) {
      throw new Error('Arkesel API key not configured')
    }

    const response = await fetch(`https://sms.arkesel.com/sms/api?action=check-balance&api_key=${apiKey}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const text = await response.text();
    console.log('Balance response (raw):', text);
    
    // Try to extract the balance from the response
    let balance = 0;
    try {
      const balanceMatch = text.match(/\d+/);
      if (balanceMatch) {
        balance = parseInt(balanceMatch[0], 10);
      }
    } catch (parseError) {
      console.error('Error parsing balance:', parseError);
    }

    console.log(`Current SMS balance: ${balance}, threshold: ${threshold}`);

    // Check if balance is below threshold
    if (balance <= threshold) {
      console.log(`Balance ${balance} is below threshold ${threshold}, creating alert...`);
      
      // Create alert in the database regardless of existing alerts
      const { data: alertData, error: alertError } = await supabaseClient
        .from("alerts")
        .insert({
          type: "low_sms_balance",
          message: `Low SMS balance alert: only ${balance} credits remaining (threshold: ${threshold})`,
          data: {
            current_balance: balance,
            threshold: threshold
          },
          status: "new"
        })
        .select();
      
      if (alertError) {
        console.error("Error creating alert:", alertError);
      } else {
        console.log("Alert created successfully:", alertData);
      }

      // Send SMS notification
      const message = `Low SMS balance alert: only ${balance} credits remaining (threshold: ${threshold})`;
      
      try {
        await sendSMS({
          message,
          recipients: [phoneNumber],
          senderId: 'MOVAalerts'
        });
        console.log(`SMS balance alert sent to ${phoneNumber}`);
      } catch (smsError) {
        console.error("Error sending SMS:", smsError);
      }
    } else {
      console.log(`Balance ${balance} is above threshold ${threshold}, no alert needed`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        balance, 
        threshold,
        isLow: balance <= threshold,
        alertCreated: balance <= threshold
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error checking SMS balance:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
