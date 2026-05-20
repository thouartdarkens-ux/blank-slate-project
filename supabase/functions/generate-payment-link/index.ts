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
    const merchantId = Deno.env.get('XCEL_MERCHANT_ID');
    const publicKey = Deno.env.get('XCEL_PUBLIC_KEY');

    if (!merchantId || !publicKey) {
      return new Response(
        JSON.stringify({ error: 'Merchant credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      amount,
      product_id,
      customer_name,
      customer_email,
      customer_phone,
      quantity,
      voucher_type,
      redirect_url,
    } = await req.json();

    const clientTransactionId = `CUD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const body = {
      amount: String(amount),
      products: [{ product_id, amount: String(amount) }],
      currency: "GHS",
      channel: "WEB",
      client_transaction_id: clientTransactionId,
      customer_name,
      customer_email,
      customer_phone,
      description: `Purchase of ${quantity} ${voucher_type} voucher(s)`,
      metadata: {
        phone_number: customer_phone,
        email: customer_email,
        quantity: Number(quantity),
      },
      redirect_url,
      webhook_url: "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/xcel-webhook",
    };

    console.log('Calling Xcel API with body:', JSON.stringify(body));

    const response = await fetch(
      'https://api.xcelapp.com/transactions-service/paygate/generate-payment-link',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MERCHANT-ID': merchantId,
          'X-PUBLIC-KEY': publicKey,
        },
        body: JSON.stringify(body),
      }
    );

    const responseData = await response.json();
    console.log('Xcel API response:', JSON.stringify(responseData));

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Payment link generation failed', details: responseData }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(responseData),
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
