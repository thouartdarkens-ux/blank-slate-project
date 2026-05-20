
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Missing Paystack secret key');
    }

    // Get the signature from the headers
    const signature = req.headers.get('x-paystack-signature');
    if (!signature) {
      throw new Error('No Paystack signature found in request headers');
    }

    const body = await req.json();
    console.log('Received webhook:', body);

    // Verify it's from Paystack
    const event = body.event;
    const data = body.data;

    if (event === 'charge.success') {
      // Initialize Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Update the transaction status in the database
      const { error } = await supabase
        .from('web_pay')
        .update({ status: 'successful' })
        .eq('reference', data.reference);

      if (error) {
        console.error('Error updating transaction:', error);
        throw error;
      }

      console.log('Successfully updated transaction:', data.reference);
    }

    // Return a 200 success response to Paystack
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
