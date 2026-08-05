

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const formatVoucherMessage = (vouchers)=>{
  let message = '';
  vouchers.forEach((voucher, index)=>{
    const title = voucher.type.toLowerCase() === 'bece' ? 'BECE RC' : 'WASSCE RC';
    message += `${title}\n`;
    message += `${index + 1}. Serial: ${voucher.serial}\n    PIN: ${voucher.pin}\n`;
  });
  // Add the appropriate link based on voucher type
  const firstVoucherType = vouchers[0]?.type.toLowerCase();
  if (firstVoucherType === 'bece') {
    message += 'Check your results at: https://eresults.waecgh.org/\n';
  } else if (firstVoucherType === 'wassce') {
    message += 'Check your results at: https://ghana.waecdirect.org/\n';
  }
   message +='Data bundles available @ https://movadatahub.shop/';
  return message;
};
Deno.serve(async (req)=>{
  // This is critical - handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  try {
    // API key validation
    const apiKey = req.headers.get('x-api-key')?.trim();
    const expectedApiKey = Deno.env.get('VOUCHER_API_KEY_NEW')?.trim();
    console.log("Received API key:", apiKey ? "Present (hidden)" : "Missing");
    console.log("Expected API key exists:", expectedApiKey ? "Yes" : "No");
    if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
      console.error('API Key validation failed');
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Initialize Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Get reference from the URL
    const url = new URL(req.url);
    const reference = url.searchParams.get('reference');
    console.log("Searching voucher history for reference:", reference);
    if (!reference) {
      throw new Error('Reference is required');
    }
    
    // Check if reference is at least 5 characters long
    if (reference.length < 5) {
      return new Response(JSON.stringify({
        error: 'Reference must be at least 5 characters long'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    
    // Query sold vouchers history using exact reference match
    const { data: vouchers, error } = await supabaseClient.from('sold_vouchers').select('serial, pin, type, phone_number').eq('reference', reference) // Using exact match instead of partial
    .order('sold_at', {
      ascending: false
    });
    if (error) {
      console.error('Database query error:', error);
      throw error;
    }
    if (!vouchers || vouchers.length === 0) {
      return new Response(JSON.stringify({
        error: 'No vouchers found for this reference'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }
    // Send SMS with voucher details
    const phoneNumber = vouchers[0].phone_number;
    const message = formatVoucherMessage(vouchers);
    
    console.log('=== VOUCHER HISTORY SMS CALL ===');
    console.log('Reference searched:', reference);
    console.log('Vouchers found:', vouchers.length);
    console.log('Sending to phone:', phoneNumber);
    
    // Get SMS API key for authenticated SMS call
    const smsApiKey = Deno.env.get('SMS_FUNCTION_API_KEY');
    
    // Call the SMS endpoint with source tracking and API key authentication
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
        source: 'voucher-history-api',
        context: `reference-lookup-${reference}`
      })
    });
    if (!smsResponse.ok) {
      const errorText = await smsResponse.text();
      console.error('Failed to send SMS:', errorText);
    } else {
      console.log('SMS sent successfully to:', phoneNumber);
    }
    console.log(`Found ${vouchers?.length || 0} vouchers in history for reference ${reference}`);
    return new Response(JSON.stringify({
      vouchers: vouchers.map((v)=>({
          serial: v.serial,
          pin: v.pin,
          type: v.type,
          phone_number: v.phone_number
        })),
      smsSent: smsResponse.ok,
      success: true
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Function error:', error.message);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});

