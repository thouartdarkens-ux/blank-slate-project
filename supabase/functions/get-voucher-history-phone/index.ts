import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key'
};

const formatVoucherMessage = (vouchers) => {
  let message = '';
  vouchers.forEach((voucher, index) => {
    const title = voucher.type.toLowerCase() === 'bece' ? 'BECE RC' : 'WASSCE RC';
    message += `${title}\n`;
    message += `${index + 1}. Serial: ${voucher.serial}\n    PIN: ${voucher.pin}\n`;
  });
  const firstVoucherType = vouchers[0]?.type.toLowerCase();
  if (firstVoucherType === 'bece') {
    message += 'Check your results at: https://eresults.waecgh.org/\n';
  } else if (firstVoucherType === 'wassce') {
    message += 'Check your results at: https://ghana.waecdirect.org/\n';
  }
  message += 'Data bundles available @ https://movadatahub.shop/';
  return message;
};

// Normalize a Ghanaian phone number to a comparable form (last 9 digits)
const normalizePhone = (phone: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.slice(-9);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  try {
    const apiKey = req.headers.get('x-api-key')?.trim();
    const expectedApiKey = Deno.env.get('VOUCHER_API_KEY_NEW')?.trim();
    if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const phone = url.searchParams.get('phone') || url.searchParams.get('phone_number');
    console.log('Searching voucher history for phone:', phone);

    if (!phone) {
      return new Response(JSON.stringify({ error: 'Phone number is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const normalized = normalizePhone(phone);
    if (normalized.length < 9) {
      return new Response(JSON.stringify({ error: 'Invalid phone number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Match any stored phone whose last 9 digits equal the normalized input
    const { data: vouchers, error } = await supabaseClient
      .from('sold_vouchers')
      .select('serial, pin, type, phone_number, sold_at, reference')
      .ilike('phone_number', `%${normalized}`)
      .order('sold_at', { ascending: false });

    if (error) {
      console.error('Database query error:', error);
      throw error;
    }

    if (!vouchers || vouchers.length === 0) {
      return new Response(JSON.stringify({ error: 'No vouchers found for this phone number' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const phoneNumber = vouchers[0].phone_number;
    const message = formatVoucherMessage(vouchers);

    const smsApiKey = Deno.env.get('SMS_FUNCTION_API_KEY');
    const smsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
        'X-API-Key': smsApiKey || ''
      },
      body: JSON.stringify({
        message,
        recipients: [phoneNumber],
        senderId: 'MOVAconsult',
        source: 'voucher-history-phone-api',
        context: `phone-lookup-${normalized}`
      })
    });

    if (!smsResponse.ok) {
      const errorText = await smsResponse.text();
      console.error('Failed to send SMS:', errorText);
    }

    return new Response(JSON.stringify({
      vouchers: vouchers.map((v) => ({
        serial: v.serial,
        pin: v.pin,
        type: v.type,
        phone_number: v.phone_number,
        sold_at: v.sold_at,
        reference: v.reference
      })),
      smsSent: smsResponse.ok,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
