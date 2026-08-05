import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { supabaseClient } from "../_shared/supabase-client.ts"
import { sendVoucherSMS } from "../_shared/sms-client.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BuyCheckerRequest {
  phone_number: string;
  product: string;
  quantity: number;
  amount: number;
  reference?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestData: BuyCheckerRequest = await req.json()
    const { phone_number, product, quantity, amount, reference } = requestData

    console.log(`Processing purchase request for ${quantity} ${product} vouchers`)

    // Create the transaction record - remove name field which doesn't exist
    const { data: transactionData, error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        phone_number,
        product,
        quantity,
        amount,
        status: 'pending',
        reference,
        date: new Date().toISOString()
      })
      .select('id')
      .single()

    if (transactionError) {
      throw new Error(`Failed to create transaction: ${transactionError.message}`)
    }

    const transactionId = transactionData.id
    console.log(`Created transaction with ID: ${transactionId}`)

    // Get vouchers from inventory based on type and quantity
    const { data: vouchers, error: vouchersError } = await supabaseClient
      .from('inventory')
      .select('id, serial, pin, type')
      .eq('type', product)
      .limit(quantity)

    if (vouchersError) {
      throw new Error(`Failed to get vouchers: ${vouchersError.message}`)
    }

    if (!vouchers || vouchers.length < quantity) {
      throw new Error(`Insufficient vouchers in inventory. Requested: ${quantity}, Available: ${vouchers?.length || 0}`)
    }

    console.log(`Found ${vouchers.length} vouchers to send`)

    // Prepare SMS message with voucher details
    let smsMessage = `Here are your ${product} vouchers:\n\n`
    vouchers.forEach((voucher, index) => {
      smsMessage += `Voucher ${index + 1}:\nSerial: ${voucher.serial}\nPIN: ${voucher.pin}\n\n`
    })
    smsMessage += "Thank you for your purchase!"
    // smsMessage += "\n\nNeed affordable data bundles? Visit https://movadatahub.shop/ for the best deals!"

    // Send SMS
    const recipients = [phone_number]
    console.log(`Sending SMS to ${phone_number}`)
    
    const smsResponse = await sendVoucherSMS({
      message: smsMessage,
      recipients
    })

    console.log('SMS API response:', smsResponse)

    // If SMS was sent successfully, update transaction status and move vouchers to sold_vouchers
    if (smsResponse) {
      console.log('SMS sent successfully, updating transaction status and records')
      
      // Update transaction status
      const { error: updateError } = await supabaseClient
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transactionId)

      if (updateError) {
        throw new Error(`Failed to update transaction status: ${updateError.message}`)
      }

      // Add vouchers to sold_vouchers table
      const soldVouchers = vouchers.map(voucher => ({
        serial: voucher.serial,
        pin: voucher.pin,
        type: voucher.type,
        phone_number,
        reference
      }))

      const { error: soldError } = await supabaseClient
        .from('sold_vouchers')
        .insert(soldVouchers)

      if (soldError) {
        throw new Error(`Failed to record sold vouchers: ${soldError.message}`)
      }

      // Delete vouchers from inventory
      const voucherIds = vouchers.map(v => v.id)
      const { error: deleteError } = await supabaseClient
        .from('inventory')
        .delete()
        .in('id', voucherIds)

      if (deleteError) {
        throw new Error(`Failed to remove vouchers from inventory: ${deleteError.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Vouchers sent successfully and inventory updated",
          transaction_id: transactionId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      throw new Error("Failed to send SMS")
    }
  } catch (error) {
    console.error('Error in buy-checker function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})
