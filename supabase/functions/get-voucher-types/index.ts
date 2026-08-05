
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { supabaseClient } from "../_shared/supabase-client.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // API key validation
    const apiKey = req.headers.get('x-api-key')?.trim()
    const expectedApiKey = Deno.env.get('VOUCHER_API_KEY_NEW')?.trim()
    
    if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
      console.error('API Key validation failed')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch voucher types
    const { data: voucherTypes, error } = await supabaseClient
      .from('voucher_types')
      .select('name, price, bulk_price');

    if (error) {
      console.error('Error fetching voucher types:', error)
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: voucherTypes,
        bulkPriceNote: "Bulk pricing applies to orders of 20 or more vouchers"
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
