
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request
    const requestData = await req.json().catch(err => {
      console.error('Error parsing request:', err);
      return {};
    });
    
    const key_name = requestData.key_name;
    
    if (!key_name) {
      console.error('Missing key_name in request');
      return new Response(
        JSON.stringify({ error: 'Key name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the key from environment variables
    const apiKey = Deno.env.get(key_name);
    console.log(`Retrieving key: ${key_name}, exists: ${apiKey ? 'Yes' : 'No'}`);
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ apiKey }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
