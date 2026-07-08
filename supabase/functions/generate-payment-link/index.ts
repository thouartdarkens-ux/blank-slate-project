import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Paystack secret key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      amount,
      customer_name,
      customer_email,
      customer_phone,
      quantity,
      voucher_type,
      redirect_url,
    } = await req.json();

    const reference = `CUD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const amountInPesewas = Math.round(Number(amount) * 100);

    const body = {
      email: customer_email,
      amount: amountInPesewas,
      currency: 'GHS',
      reference,
      callback_url: redirect_url,
      metadata: {
        full_name: customer_name,
        mobile_number: customer_phone,
        product_type: String(voucher_type || '').toUpperCase(),
        quantity: Number(quantity),
        amount: Number(amount),
      },
    };

    console.log('Calling Paystack initialize with body:', JSON.stringify(body));

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json();
    console.log('Paystack response:', JSON.stringify(responseData));

    if (!response.ok || !responseData?.status) {
      return new Response(
        JSON.stringify({ error: 'Payment link generation failed', details: responseData }),
        { status: response.status || 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        data: {
          payment_link: responseData.data.authorization_url,
          reference: responseData.data.reference,
          access_code: responseData.data.access_code,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
