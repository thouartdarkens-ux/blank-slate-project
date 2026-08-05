
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { supabaseClient } from "../_shared/supabase-client.ts"
import { sendSMS } from "../_shared/sms-client.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LowStockMessage {
  voucherType: string;
  currentStock: number;
  threshold: number;
  phone: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { voucherType, currentStock, threshold, phone }: LowStockMessage = await req.json()

    // Send SMS using the shared SMS client
    const message = `Low stock alert: ${voucherType} has only ${currentStock} vouchers remaining (threshold: ${threshold}).`
    
    const smsResponse = await sendSMS({
      message,
      recipients: [phone]
    })

    console.log('SMS sent successfully:', smsResponse)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in send-low-stock-sms function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})
