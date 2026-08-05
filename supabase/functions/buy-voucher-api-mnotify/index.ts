import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseClient } from "../_shared/supabase-client.ts";
// mNotify SMS sender (replaces Arkesel sendAlertSMS/sendVoucherSMS)
const MNOTIFY_API_KEY = Deno.env.get('MNOTIFY_API_KEY') ?? 'U9tYHZivslD9dMBEv3tOrp7C8';
const MNOTIFY_SENDER = 'MOVAconsult';
async function sendMnotifySMS({ message, recipients, senderId }: { message: string; recipients: string[]; senderId?: string }) {
  const url = `https://api.mnotify.com/api/sms/quick?key=${MNOTIFY_API_KEY}`;
  const body = {
    recipient: recipients,
    sender: senderId,
    message,
    is_schedule: false,
    schedule_date: ""
  };
  console.log('📲 mNotify send ->', { recipients, sender: senderId, preview: message.slice(0, 80) });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('mNotify error', res.status, text);
    throw new Error(`mNotify failed ${res.status}: ${text}`);
  }
  try { return JSON.parse(text); } catch { return { raw: text }; }
}
const sendAlertSMS = sendMnotifySMS;
const sendVoucherSMS = sendMnotifySMS;
import { generateVoucherCSV, generateVoucherPDF, uploadVoucherFile } from "../_shared/voucher-file-generator.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key'
};
const requestQueue = [];
let processing = false;
async function processQueue() {
  if (processing) return;
  processing = true;
  while(requestQueue.length > 0){
    const { req, resolve } = requestQueue.shift();
    try {
      const response = await handleVoucherRequest(req);
      resolve(response);
    } catch (error) {
      resolve(new Response(JSON.stringify({
        error: error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }));
    }
  }
  processing = false;
}
const getResultCheckingLink = (product)=>{
  switch(product.toUpperCase()){
    case 'BECE':
      return 'eresults.waecgh.org';
    case 'WASSCE':
      return 'ghana.waecdirect.org';
    default:
      return '';
  }
};
const formatVoucherBatch = (vouchers, startIndex, batchSize, product)=>{
  let message = '';
  const endIndex = Math.min(startIndex + batchSize, vouchers.length);
  const title = product.toUpperCase() === 'WASSCE' ? 'WASSCE RC' : product.toUpperCase() === 'BECE' ? 'BECE RC' : product.toUpperCase();
  message += `${title}\n`;
  for(let i = startIndex; i < endIndex; i++){
    message += `${i + 1}. Serial:${vouchers[i].serial}\n    PIN:${vouchers[i].pin}\n`;
  }
  return message;
};
const generateVoucherAttachment = async (vouchers, product, quantity, phone)=>{
  try {
    console.log(`📄 Generating voucher attachment for ${quantity} ${product} vouchers`);
    if (quantity > 10) {
      // Generate CSV for quantities above 10
      console.log(`📄 Generating CSV attachment for ${quantity} vouchers`);
      const csvContent = generateVoucherCSV(vouchers, product);
      const filename = `vouchers_${product}_${Date.now()}.csv`;
      const fileUrl = await uploadVoucherFile(csvContent, filename, 'text/csv', supabaseClient);
      return {
        filename: filename,
        url: fileUrl
      };
    } else {
      // Generate PDF for quantities 10 and below
      console.log(`📄 Generating PDF attachment for ${quantity} vouchers`);
      const pdfContent = generateVoucherPDF(vouchers, product, phone);
      const filename = `vouchers_${product}_${Date.now()}.pdf`;
      const fileUrl = await uploadVoucherFile(pdfContent, filename, 'application/pdf', supabaseClient);
      return {
        filename: filename,
        url: fileUrl
      };
    }
  } catch (error) {
    console.error('Error generating voucher attachment:', error);
    return null;
  }
};
const sendTransactionEmail = async (email, templateData, attachment = null)=>{
  try {
    console.log(`=== EMAIL SENDING START ===`);
    console.log(`Target email: ${email}`);
    console.log(`Template data:`, JSON.stringify(templateData, null, 2));
    console.log(`Attachment:`, attachment ? JSON.stringify(attachment, null, 2) : 'None');
    if (!email) {
      console.log(`❌ Email sending skipped - no email provided`);
      return false;
    }
    console.log(`📧 Invoking send-email function via supabaseClient...`);
    const emailPayload = {
      to: [
        email
      ],
      template_data: templateData
    };
    // Add attachment if provided
    if (attachment) {
      console.log(`📎 Adding attachment to email: ${attachment.filename}`);
      emailPayload.attachments = [
        attachment
      ];
    }
    const { data, error } = await supabaseClient.functions.invoke('send-email', {
      body: emailPayload
    });
    if (error) {
      console.error('❌ Email sending failed with error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false;
    }
    console.log('✅ Email sent successfully with attachment!');
    console.log('Response data:', JSON.stringify(data, null, 2));
    console.log(`=== EMAIL SENDING END ===`);
    return true;
  } catch (error) {
    console.error('❌ Exception in sendTransactionEmail:', error);
    console.error('Exception stack:', error.stack);
    console.log(`=== EMAIL SENDING END (ERROR) ===`);
    return false;
  }
};
const fulfillTransaction = async (transaction)=>{
  console.log(`🔄 Fulfilling transaction ${transaction.id}...`);
  const { data: vouchers, error: vouchersError } = await supabaseClient.from('inventory').select('id, serial, pin, type').eq('type', transaction.product).limit(transaction.quantity);
  if (vouchersError || !vouchers || vouchers.length < transaction.quantity) {
    console.error('Still insufficient vouchers for fulfillment');
    return false;
  }
  const soldVouchersData = vouchers.map((voucher)=>({
      serial: voucher.serial,
      pin: voucher.pin,
      type: voucher.type,
      phone_number: transaction.phone_number,
      reference: transaction.reference
    }));
  await supabaseClient.from('sold_vouchers').insert(soldVouchersData);
  await supabaseClient.from('inventory').delete().in('id', vouchers.map((v)=>v.id));
  // Only update status to completed for transactions with quantity <= 30
  // Larger transactions will need manual download via admin panel
  if (transaction.quantity <= 30) {
    await supabaseClient.from('transactions').update({
      status: 'completed'
    }).eq('id', transaction.id);
  }
  if (transaction.quantity > 30) {
    const smsMessage = "Message too long for SMS please reach out to us on 0557956020/ 05438848199 to arrange delivery via alternate means";
    await sendVoucherSMS({
      message: smsMessage,
      recipients: [
        transaction.phone_number
      ],
      senderId: 'MOVAalerts'
    });
  } else {
    const batchSize = 10;
    for(let i = 0; i < transaction.quantity; i += batchSize){
      let smsMessage = `# ${Math.floor(i / batchSize) + 1}/${Math.ceil(transaction.quantity / batchSize)}\n`;
      smsMessage += formatVoucherBatch(vouchers, i, batchSize, transaction.product);
      const resultLink = getResultCheckingLink(transaction.product);
      if (resultLink) {
        smsMessage +=resultLink;
      }
      if (i + batchSize >= transaction.quantity) {
        smsMessage += '\nData bundles available @ https://movadatahub.shop/';
      }
      await sendVoucherSMS({
        message: smsMessage,
        recipients: [
          transaction.phone_number
        ],
        senderId: 'MOVAconsult'
      });
    }
  }
  return true;
};
serve(async (req)=>{
  console.log(`📥 New request received: ${req.method} ${req.url}`);
  if (req.method === 'OPTIONS') {
    console.log(`✅ CORS preflight request handled`);
    return new Response(null, {
      headers: corsHeaders
    });
  }
  return new Promise((resolve)=>{
    requestQueue.push({
      req,
      resolve
    });
    processQueue();
  });
});
async function handleVoucherRequest(req) {
  try {
    const url = new URL(req.url);
    if (url.pathname.endsWith('/check-pending')) {
      console.log(`🔍 Processing check-pending request...`);
      const { data: pendingTransactions, error: pendingError } = await supabaseClient.from('transactions').select('*').in('status', ['pending', 'awaiting_inventory']).gt('amount', 0);
      if (pendingError) {
        throw new Error(`Failed to fetch pending transactions: ${pendingError.message}`);
      }
      for (const transaction of pendingTransactions || []){
        // Skip if vouchers already exist for this reference
        if (transaction.reference) {
          const { data: existingVouchers } = await supabaseClient
            .from('sold_vouchers')
            .select('id')
            .eq('reference', transaction.reference)
            .limit(1);
          if (existingVouchers && existingVouchers.length > 0) {
            console.log(`⚠️ Skipping transaction ${transaction.id} — already has vouchers. Marking completed.`);
            await supabaseClient.from('transactions').update({ status: 'completed' }).eq('id', transaction.id);
            continue;
          }
        }
        const fulfilled = await fulfillTransaction(transaction);
        console.log(`Transaction ${transaction.id} fulfillment ${fulfilled ? 'succeeded' : 'failed'}`);
      }
      return new Response(JSON.stringify({
        success: true,
        message: `Processed ${pendingTransactions?.length || 0} pending transactions`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (url.pathname.endsWith('/retry-single')) {
      console.log(`🔄 Processing retry-single request...`);
      const body = await req.json();
      const { transaction_id } = body;
      if (!transaction_id) {
        return new Response(JSON.stringify({ error: 'transaction_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const { data: transaction, error: txError } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('id', transaction_id)
        .single();
      if (txError || !transaction) {
        return new Response(JSON.stringify({ error: 'Transaction not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (!['pending', 'awaiting_inventory'].includes(transaction.status) || transaction.amount <= 0) {
        return new Response(JSON.stringify({ error: 'Transaction is not eligible for retry' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if vouchers already exist in sold_vouchers for this reference
      if (transaction.reference) {
        const { data: existingVouchers } = await supabaseClient
          .from('sold_vouchers')
          .select('id')
          .eq('reference', transaction.reference)
          .limit(1);
        if (existingVouchers && existingVouchers.length > 0) {
          console.log(`⚠️ Transaction ${transaction_id} already has vouchers in sold_vouchers. Marking as completed.`);
          await supabaseClient.from('transactions').update({ status: 'completed' }).eq('id', transaction_id);
          return new Response(JSON.stringify({
            success: true,
            message: 'Transaction already fulfilled — marked as completed'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      const fulfilled = await fulfillTransaction(transaction);
      if (fulfilled) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Transaction processed successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: 'Insufficient inventory to fulfill transaction'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    const apiKey = req.headers.get('x-api-key')?.trim();
    const expectedApiKey = Deno.env.get('VOUCHER_API_KEY_NEW')?.trim();
    if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
      console.error('❌ API Key validation failed');
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
    console.log(`✅ API Key validation passed`);
    const requestBody = await req.json();
    console.log(`📋 Request body:`, JSON.stringify(requestBody, null, 2));
    const { reference, phone_number, product, quantity, amount, email } = requestBody;
    if (!reference) {
      throw new Error('Reference is required');
    }
    console.log(`🔍 Processing voucher purchase with reference: ${reference}`);
    // SECURITY FEATURE: Validate the amount against voucher type price
    const { data: voucherTypeData, error: voucherTypeError } = await supabaseClient.from('voucher_types').select('price, bulk_price').eq('name', product).single();
    if (voucherTypeError || !voucherTypeData) {
      throw new Error(`Invalid voucher type: ${product}`);
    }
    // Calculate expected amount based on quantity and pricing rules
    const { price, bulk_price } = voucherTypeData;
    const usesBulkPrice = quantity >= 20 && bulk_price !== null;
    const expectedAmount = quantity * (usesBulkPrice ? bulk_price : price);
    // Convert both amounts to fixed precision for comparison to handle both integer and float values
    const normalizedExpectedAmount = Number(expectedAmount.toFixed(2));
    const normalizedActualAmount = Number(Number(amount).toFixed(2));
    // If amount doesn't match expected, record as compromised transaction and return error
    if (normalizedActualAmount !== normalizedExpectedAmount) {
      console.log(`Amount mismatch detected. Expected: ${normalizedExpectedAmount}, Got: ${normalizedActualAmount}`);
      // Record transaction as compromised
      const { data: compTransaction, error: compTransactionError } = await supabaseClient.from('transactions').insert({
        reference,
        phone_number,
        product,
        quantity,
        amount,
        status: 'compromised'
      }).select('id');
      if (compTransactionError) {
        console.error("Error creating compromised transaction:", compTransactionError);
      } else {
        console.log("Created compromised transaction:", compTransaction);
      }
      // Create security alert
      const { data: alertData, error: alertError } = await supabaseClient.from('alerts').insert({
        type: 'malicious_activity',
        message: `Potential malicious activity detected: Amount mismatch for ${product} purchase`,
        status: 'new',
        data: {
          expected_amount: expectedAmount,
          provided_amount: amount,
          product,
          quantity,
          phone_number,
          reference
        }
      }).select('id');
      if (alertError) {
        console.error("Error creating security alert:", alertError);
      } else {
        console.log("Created security alert:", alertData);
      }
      return new Response(JSON.stringify({
        error: "Transaction amount validation failed. Security alert has been triggered."
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Send additional SMS for references that don't start with "02MPAY" or "CUD"
    if (!reference.startsWith('02MPAY') && !reference.startsWith('CUD')) {
      const extraMessage = `Payment ref: ${reference} for ${quantity} ${product} vouchers - GHC${amount}`;
      let notificationPhoneNumber = `${phone_number}`;
      // Always attempt to send the notification
      try {
        console.log(`Sending reference notification for ${reference} to ${notificationPhoneNumber}`);
        const alertResponse = await sendAlertSMS({
          message: extraMessage,
          recipients: [
            notificationPhoneNumber
          ],
          senderId: 'MOVAalerts'
        });
        console.log(`Alert SMS response for reference notification:`, alertResponse);
        console.log(`Extra alert SMS sent to ${notificationPhoneNumber} for reference ${reference}`);
      } catch (alertError) {
        console.error(`Failed to send alert SMS for reference:`, alertError);
      // Continue processing even if notification fails
      }
    }
    // Check if reference has already been used
    const { data: existingReference, error: refError } = await supabaseClient.from('sold_vouchers').select('reference').eq('reference', reference).limit(1);
    if (existingReference && existingReference.length > 0) {
      console.log(`❌ Reference ${reference} has already been used`);
      return new Response(JSON.stringify({
        error: "This reference has already been used"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check if there's already a transaction with this reference
    const { data: existingTransaction, error: existingError } = await supabaseClient.from('transactions').select('id').eq('reference', reference).maybeSingle();
    if (existingTransaction) {
      console.log(`❌ Transaction with reference ${reference} already exists`);
      throw new Error(`Transaction with reference ${reference} already exists`);
    }
    // Get email from transactions table if not provided in request
    let customerEmail = email;
    console.log(`📧 Email from request: ${email || 'none provided'}`);
    if (!customerEmail) {
      console.log(`🔍 Looking for existing email for phone ${phone_number}...`);
      const { data: transactionWithEmail, error: emailError } = await supabaseClient.from('transactions').select('email').eq('phone_number', phone_number).not('email', 'is', null).limit(1).maybeSingle();
      if (!emailError && transactionWithEmail) {
        customerEmail = transactionWithEmail.email;
        console.log(`✅ Found existing email for phone ${phone_number}: ${customerEmail}`);
      } else {
        console.log(`❌ No existing email found for phone ${phone_number}`);
      }
    } else {
      console.log(`✅ Using email from request: ${customerEmail}`);
    }
    const { data: vouchers, error: vouchersError } = await supabaseClient.from('inventory').select('id, serial, pin, type').eq('type', product).limit(quantity);
    if (!vouchers || vouchers.length < quantity) {
      console.log(`❌ Insufficient vouchers available. Requested: ${quantity}, Available: ${vouchers?.length || 0}`);
      const { data: transaction, error: transactionError } = await supabaseClient.from('transactions').insert({
        reference,
        phone_number,
        product,
        quantity,
        amount,
        email: customerEmail,
        status: 'awaiting_inventory'
      }).select('id').single();
      if (transactionError) {
        throw new Error(`Failed to create transaction: ${transactionError.message}`);
      }
      const smsMessage = `Your order for ${quantity} ${product} vouchers is being processed. Kindly call 0557956020 if vouchers delay.`;
      await sendAlertSMS({
        message: smsMessage,
        recipients: [
          phone_number
        ],
        senderId: 'MOVAalerts'
      });
      return new Response(JSON.stringify({
        success: true,
        message: "Transaction recorded and awaiting inventory",
        status: 'awaiting_inventory',
        transaction_id: transaction.id
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    console.log(`✅ Sufficient vouchers available. Processing transaction...`);
    // Create transaction - for orders > 30, keep as pending
    const transactionStatus = quantity > 30 ? 'pending' : 'pending'; // Will be updated to completed after processing
    const { data: transaction, error: transactionError } = await supabaseClient.from('transactions').insert({
      reference,
      phone_number,
      product,
      quantity,
      amount,
      email: customerEmail,
      status: transactionStatus
    }).select('id').single();
    if (transactionError) {
      console.error('Transaction error:', transactionError);
      throw new Error(`Failed to create transaction: ${transactionError.message}`);
    }
    console.log(`✅ Transaction created with ID: ${transaction.id}`);
    // Prepare template data for email
    const phone = phone_number;
    const templateData = {
      product: product,
      quantity: quantity,
      amount_ghc: amount,
      reference_id: reference
    };
    console.log(`📧 Prepared template data for email:`, JSON.stringify(templateData, null, 2));
    // Generate voucher attachment if email is available
    let voucherAttachment = null;
    if (customerEmail) {
      console.log(`📄 Generating voucher attachment for email delivery`);
      const voucherData = vouchers.map((v)=>({
          serial: v.serial,
          pin: v.pin,
          type: v.type
        }));
      voucherAttachment = await generateVoucherAttachment(voucherData, product, quantity, phone);
    }
    if (quantity > 30) {
      console.log(`📱 Large order (${quantity} > 30) - sending SMS notification only`);
      const smsMessage = "Message too long for SMS please reach out to us on 0557956020/ 05438848199 to arrange delivery via alternate means";
      await sendVoucherSMS({
        message: smsMessage,
        recipients: [
          phone_number
        ],
        senderId: 'MOVAalerts'
      });
      // Send email for large orders only if email is available
      if (customerEmail) {
        console.log(`📧 Large order - attempting to send email with attachment to: ${customerEmail}`);
        const emailSent = await sendTransactionEmail(customerEmail, templateData, voucherAttachment);
        console.log(`📧 Large order email result: ${emailSent ? 'SUCCESS' : 'FAILED'}`);
      } else {
        console.log(`📧 Large order - no email available for notification`);
      }
    } else {
      console.log(`📱 Regular order (${quantity} <= 30) - sending SMS vouchers`);
      const batchSize = 10;
      for(let i = 0; i < quantity; i += batchSize){
        console.log(`📱 Sending SMS batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(quantity / batchSize)}`);
        let smsMessage = `# ${Math.floor(i / batchSize) + 1}/${Math.ceil(quantity / batchSize)}\n`;
        smsMessage += formatVoucherBatch(vouchers, i, batchSize, product);
        const resultLink = getResultCheckingLink(product);
        if (resultLink) {
          smsMessage +=resultLink;
        }
        if (i + batchSize >= quantity) {
           smsMessage += '\nData bundles available @ https://movadatahub.shop/';
        }
        await sendVoucherSMS({
          message: smsMessage,
          recipients: [
            phone_number
          ],
          senderId: 'MOVAconsult'
        });
      }
      // Send email after all SMS batches are sent (only once per transaction and only if email is available)
      if (customerEmail) {
        console.log(`📧 Regular order - attempting to send email with attachment to: ${customerEmail}`);
        const emailSent = await sendTransactionEmail(customerEmail, templateData, voucherAttachment);
        console.log(`📧 Regular order email result: ${emailSent ? 'SUCCESS' : 'FAILED'}`);
      } else {
        console.log(`📧 Regular order - no email available for transaction notification`);
      }
    }
    console.log(`💾 Recording sold vouchers in database...`);
    const soldVouchersData = vouchers.map((voucher)=>({
        serial: voucher.serial,
        pin: voucher.pin,
        type: voucher.type,
        phone_number,
        reference
      }));
    await supabaseClient.from('sold_vouchers').insert(soldVouchersData);
    await supabaseClient.from('inventory').delete().in('id', vouchers.map((v)=>v.id));
    // Only update status to completed if quantity <= 30
    if (quantity <= 30) {
      console.log(`✅ Updating transaction status to completed`);
      await supabaseClient.from('transactions').update({
        status: 'completed'
      }).eq('id', transaction.id);
    } else {
      console.log(`⏳ Large order - keeping transaction status as pending`);
    }
    console.log(`✅ Transaction processing completed successfully`);
    return new Response(JSON.stringify({
      success: true,
      message: "Vouchers sent successfully",
      voucher:soldVouchersData,
      transaction_id: transaction.id
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Error in buy-voucher-api:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
