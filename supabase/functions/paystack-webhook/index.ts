import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Paystack webhook body:', JSON.stringify(body));
    console.log('Paystack webhook headers:', JSON.stringify(Object.fromEntries(req.headers)));

    const data = body?.data ?? {};
    const metadata = data?.metadata ?? {};

    const reference = data?.reference;
    const amountPesewas = data?.amount;
    const amountCedis = metadata?.amount ?? (typeof amountPesewas === 'number' ? amountPesewas / 100 : undefined);
    const phone_number = metadata?.mobile_number;
    const email = data?.customer?.email;
    const full_name = metadata?.full_name;
    const quantity = typeof metadata?.quantity === 'number'
      ? metadata.quantity
      : parseInt(String(metadata?.quantity ?? '1'), 10);
    const product_type_raw = metadata?.product_type ?? '';
    const product_type = String(product_type_raw).toUpperCase();

    console.log('🔄 Parsed:', { reference, amountCedis, phone_number, email, full_name, quantity, product_type });

    if (body?.event !== 'charge.success' || data?.status !== 'success') {
      console.log('ℹ️ Ignoring non-success event');
    const arkeselApiKey = 'd21HelpLTHdvaWlwVGNLV2NTRFE';
    const senderId = 'Movaalerts';
    const recipients = [phone_number];
    const fullNamePart = full_name ? ` Name: ${full_name}.` : '';
    const message = `Payment failed. 
Ensure this number has MoMo & GH¢25+ balance.
Dial *389*603# again to retry.`;

    console.log('📨 Sending Arkesel SMS:', message);

    const smsRes = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: {
        'api-key': arkeselApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
        message,
        recipients,
        sandbox: false,
      }),
    });
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (product_type === 'WASSCE' || product_type === 'BECE') {
      const VOUCHER_API_KEY = Deno.env.get('VOUCHER_API_KEY');
      if (!VOUCHER_API_KEY) {
        console.error('❌ Missing VOUCHER_API_KEY');
        throw new Error('Missing voucher API key');
      }

      if (!reference || !phone_number || isNaN(quantity) || !amountCedis) {
        console.error('❌ Missing required fields', { reference, phone_number, quantity, amountCedis });
        throw new Error('Invalid payload: missing required fields');
      }

      console.log('🚀 Calling voucher API:', { reference, phone_number, product: product_type, quantity, amount: amountCedis });

      const response = await fetch('https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/buy-voucher-api-mnotify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': VOUCHER_API_KEY,
        },
        body: JSON.stringify({
          reference,
          phone_number,
          product: product_type,
          quantity,
          amount: amountCedis,
          metadata,
        }),
      });

      const respText = await response.text();
      console.log(`📡 Voucher API status ${response.status}:`, respText);

      if (!response.ok) {
        throw new Error(`Voucher API error: ${respText}`);
      }

      return new Response(JSON.stringify({ success: true, data: respText }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Non-voucher products: send SMS notification via Arkesel
    const arkeselApiKey = 'd21HelpLTHdvaWlwVGNLV2NTRFE';
    const senderId = 'Movaalerts';
    const recipients = ['0557956020'];
    const fullNamePart = full_name ? ` Name: ${full_name}.` : '';
    const message = `New ${product_type_raw} order. Ref: ${reference}. Phone: ${phone_number}.${fullNamePart} Amount in cedis not peswas : GHS ${amountCedis}. Qty: ${quantity}.`;

    console.log('📨 Sending Arkesel SMS:', message);

    const smsRes = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: {
        'api-key': arkeselApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
        message,
        recipients,
        sandbox: false,
      }),
    });

    const smsData = await smsRes.json();
    console.log('📨 Arkesel response:', JSON.stringify(smsData));

    return new Response(JSON.stringify({ success: true, sms: smsData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('💥 Webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Webhook error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
