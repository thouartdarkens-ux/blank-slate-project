
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const apiKey = Deno.env.get('ARKESEL_API_KEY')
    
    if (!apiKey) {
      throw new Error('Arkesel API key not configured')
    }

    // Using the correct format for the Arkesel API v2 balance check
    const response = await fetch(`https://sms.arkesel.com/sms/api?action=check-balance&api_key=${apiKey}`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const text = await response.text()
    console.log('Balance response (raw):', text)
    
    // Parse the response - Arkesel returns data in a specific format
    // Handle the response format which might not be standard JSON
    let balance = 0
    try {
      // Try to extract the balance from the response
      // The format might be like "1000" or "balance: 1000" or similar
      const balanceMatch = text.match(/\d+/)
      if (balanceMatch) {
        balance = parseInt(balanceMatch[0], 10)
      }
    } catch (parseError) {
      console.error('Error parsing balance:', parseError)
    }

    return new Response(JSON.stringify({ balance }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error checking SMS balance:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
