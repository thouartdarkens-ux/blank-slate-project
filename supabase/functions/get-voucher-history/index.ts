
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the API key from environment
    const apiKey = Deno.env.get('VOUCHER_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let reference;

    // Get reference from request body for POST requests
    if (req.method === 'POST') {
      const requestData = await req.json();
      reference = requestData.reference;
    } else {
      // Also support GET requests with URL params for flexibility
      const url = new URL(req.url);
      reference = url.searchParams.get('reference');
    }

    if (!reference) {
      return new Response(
        JSON.stringify({ error: "Reference parameter is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching voucher history for reference: ${reference}`);

    // Call the external API
    const externalApiUrl = `https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/get-voucher-history?reference=${reference}`;
    const response = await fetch(externalApiUrl, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      }
    });

    const responseData = await response.text();
    console.log(`External API response status: ${response.status}`);

    // Return the API response with CORS headers
    if (!response.ok) {
      console.error(`External API error: ${responseData}`);
      return new Response(
        responseData,
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      responseData,
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error processing request: ${errMsg}`);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
