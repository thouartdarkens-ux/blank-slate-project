
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // API Key validation
  const apiKey = req.headers.get('x-api-key')?.trim();
  const expectedApiKey = Deno.env.get('VOUCHER_API_KEY_NEW')?.trim();
  if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
    console.error('❌ API Key validation failed');
    return new Response(JSON.stringify({
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  
  console.log(`✅ API Key validation passed`);

  try {
    const url = new URL(req.url)
    const phone_number = url.searchParams.get('phone_number')

    console.log(`GET request - phone_number: ${phone_number}`)

    if (!phone_number) {
      return new Response(
        JSON.stringify({ success: false, error: 'phone_number query parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Query transactions table for most recent email by phone number
    const { data, error } = await supabase
      .from('transactions')
      .select('email')
      .eq('phone_number', phone_number)
      .not('email', 'is', null)
      .order('date', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to retrieve email' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const email = data && data.length > 0 ? data[0].email : null

    console.log(`Retrieved email: ${email} for phone_number: ${phone_number}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        email, 
        phone_number 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
