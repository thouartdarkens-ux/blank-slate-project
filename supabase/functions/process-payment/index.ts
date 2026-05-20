
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { amount, email, phoneNumber, provider } = await req.json();

    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');

    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Payment configuration error: Missing API key');
    }

    // Convert amount to pesewas (Paystack requires amount in smallest currency unit)
    const amountInPesewas = Math.round(amount * 100);

    // Prepare the payment payload according to Paystack API requirements
    const payload = {
      amount: amountInPesewas,
      email: email,
      currency: "GHS",
      mobile_money: {
        phone: phoneNumber,
        provider: provider
      }
    };

    console.log('Sending payment request to Paystack:', payload);

    const response = await fetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Paystack API response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Payment processing failed');
    }

    return new Response(JSON.stringify({
      success: true,
      reference: data.data.reference,
      message: 'Payment initiated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
