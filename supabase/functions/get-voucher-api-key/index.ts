
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get the API key from the environment
  const apiKey = Deno.env.get('VOUCHER_API_KEY');
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not found' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }

  // Return the API key
  return new Response(
    JSON.stringify({ 
      apiKey,
      message: 'API key retrieved successfully' 
    }),
    { 
      status: 200, 
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      } 
    }
  );
});
