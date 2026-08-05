
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
    const { phone_number, email } = await req.json()

    console.log(`POST request - phone_number: ${phone_number}, email: ${email}`)

    // Validate input
    if (!phone_number) {
      return new Response(
        JSON.stringify({ success: false, error: 'phone_number is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Insert into transactions table
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        phone_number,
        email,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to store record' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Successfully created record with ID: ${data.id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        transaction_id: data.id, 
        message: 'Phone number and email stored successfully' 
      }),
      { 
        status: 201, 
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
