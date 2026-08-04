import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  console.log('🔔 Xcel Webhook Called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔒 CORS preflight request received');
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    // Get API key from environment
    const VOUCHER_API_KEY = Deno.env.get('VOUCHER_API_KEY');
    if (!VOUCHER_API_KEY) {
      console.error('❌ Missing voucher API key');
      throw new Error('Missing voucher API key');
    }

    // Get the request body
    const body = await req.json();
    console.log('📥 WEBHOOK PAYLOAD:', JSON.stringify(body, null, 2));
    console.log('📊 Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

    // Check if the payload matches the new format
    const isNewFormat = body.eventType === 'product_payment' && body.data;
    let reference, amount, quantityStr, product_id, phone_number, email;
    let metadata: Record<string, any> = {};

    if (isNewFormat) {
      // Extract fields from new payload format
      reference = body.data.transactionId;
      amount = body.data.amount;
      phone_number =body.data.payerId
      quantityStr = body.data.description;
      product_id = body.data.productId;

      // Handle metadata (can be string or object)
      if (body.data.metadata) {
        try {
          if (typeof body.data.metadata === "string") {
            metadata = JSON.parse(body.data.metadata);
          } else {
            metadata = body.data.metadata;
          }

          // phone_number = metadata.phone_number;
          email = metadata.email;

          if (metadata.quantity) {
            quantityStr = metadata.quantity.toString();
          }

          console.log('📦 Metadata parsed:', JSON.stringify(metadata, null, 2));
        } catch (err) {
          console.error("⚠️ Failed to parse metadata:", err, body.data.metadata);
        }
      } else {
        // Try to get additional data from URL parameters if available
        try {
          const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
          const metadataParam = urlParams.get('metadata');
          if (metadataParam) {
            const parsedMetadata = JSON.parse(decodeURIComponent(metadataParam));
            metadata = parsedMetadata;
            // phone_number = parsedMetadata.phone_number;
            email = parsedMetadata.email;
            if (parsedMetadata.quantity) {
              quantityStr = parsedMetadata.quantity.toString();
            }
            console.log('📦 Metadata from URL parameters:', JSON.stringify(parsedMetadata, null, 2));
          }
        } catch (error) {
          console.log('⚠️ Error parsing URL metadata:', error);
        }
      }
    } else {
      // Original format
      reference = body["Reference Number"];
      amount = body["Amount"];
      quantityStr = body["Description"];
      product_id = body["Product"];
      phone_number = body["payerId"];
    }

    console.log('🔄 Mapped Transaction Data:', {
      reference,
      amount,
      quantityStr,
      product_id,
      phone_number,
      email,
      metadata
    });

    // Get quantity from metadata if available, otherwise parse from quantityStr
    let quantity;
    if (metadata.quantity !== undefined) {
      quantity = typeof metadata.quantity === 'number'
        ? metadata.quantity
        : parseInt(metadata.quantity.toString(), 10);
      console.log('🧮 Using quantity from metadata:', quantity);
    } else {
      quantity = typeof quantityStr === 'number'
        ? quantityStr
        : parseInt(quantityStr, 10);
      console.log('🧮 Using quantity from description:', quantity);
    }

    // Map product ID to product name
    let product = "WASSCE"; // Default
    if (product_id === "OuwclNa2V") {
      product = "BECE";
    } else if (product_id === "DN0X1U1JL") {
      product = "WASSCE";
    }

    console.log('🧮 Parsed Data:', {
      quantity,
      product,
      isNaN: isNaN(quantity)
    });

    // Print visualization of metadata for debugging
    console.log('📋 METADATA VISUALIZATION:');
    console.log('┌───────────────────────────────────────────────');
    console.log(`│ Transaction Reference: ${reference}`);
    console.log(`│ Product: ${product} (ID: ${product_id})`);
    console.log(`│ Quantity: ${quantity}`);
    console.log(`│ Amount: ${amount}`);
    console.log(`│ Phone Number: ${phone_number}`);
    console.log(`│ Email: ${email || metadata.email || 'N/A'}`);
    if (Object.keys(metadata).length > 0) {
      console.log('│ Complete Metadata:');
      Object.entries(metadata).forEach(([key, value]) => {
        console.log(`│ - ${key}: ${value}`);
      });
    }
    console.log('└───────────────────────────────────────────────');

    // Validate required fields
    if (!reference || !phone_number || !product_id || isNaN(quantity) || !amount) {
      console.error('❌ Missing or invalid required fields in webhook payload:', {
        reference,
        phone_number,
        product_id,
        quantityStr,
        quantity,
        amount
      });
      throw new Error('Invalid webhook payload: missing or invalid required fields');
    }

    // Proceed directly to calling the voucher API
    console.log('🚀 Calling voucher API with payload:', JSON.stringify({
      reference,
      phone_number,
      product,
      quantity,
      amount,
      metadata
    }, null, 2));

    const response = await fetch('https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/buy-voucher-api-mnotify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': VOUCHER_API_KEY
      },
      body: JSON.stringify({
        reference,
        phone_number,
        product,
        quantity,
        amount,
        metadata
      })
    });

    const responseStatus = response.status;
    const responseHeaders = Object.fromEntries(response.headers.entries());
    console.log(`📡 Voucher API response status: ${responseStatus}`, responseHeaders);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error purchasing voucher:', errorText);
      throw new Error(`Voucher API error: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Voucher purchase successful:', JSON.stringify(data, null, 2));

    // Return success response to the webhook sender
    return new Response(JSON.stringify({
      success: true,
      message: 'Voucher purchased successfully',
      data
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('💥 Webhook error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
