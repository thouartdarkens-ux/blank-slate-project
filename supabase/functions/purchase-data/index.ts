import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] purchase-data: Request received - ${req.method}`);

  try {
    const body = await req.json();
    const { phoneNumber, network, capacity, amount, paystackReference, paystackId, retryTransactionId } = body;
    console.log(`[${requestId}] Input:`, JSON.stringify({ phoneNumber, network, capacity, amount, paystackReference, retryTransactionId }));

    if (!phoneNumber || !network || !capacity || !amount) {
      console.error(`[${requestId}] Validation failed: missing required fields`);
      return new Response(
        JSON.stringify({ error: "phoneNumber, network, capacity, and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let txnId: string;

    if (retryTransactionId) {
      // Retry: update existing failed transaction back to pending
      console.log(`[${requestId}] Retrying existing transaction: ${retryTransactionId}`);
      const { error: updateError } = await supabase
        .from("data_transactions")
        .update({ status: "pending", error_message: null })
        .eq("id", retryTransactionId);
      if (updateError) {
        console.error(`[${requestId}] Failed to reset transaction:`, updateError.message);
        throw new Error(`Failed to reset transaction: ${updateError.message}`);
      }
      txnId = retryTransactionId;
    } else {
      // New purchase: insert pending transaction
      console.log(`[${requestId}] Inserting pending transaction...`);
      const { data: txn, error: insertError } = await supabase
        .from("data_transactions")
        .insert({
          phone_number: phoneNumber,
          network,
          capacity: String(capacity),
          amount: Number(amount),
          status: "pending",
          transaction_reference: paystackReference || null,
          paystack_id: paystackId || paystackReference || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error(`[${requestId}] DB insert failed:`, insertError.message);
        throw new Error(`DB insert failed: ${insertError.message}`);
      }
      console.log(`[${requestId}] Transaction created with id: ${txn.id}`);
      txnId = txn.id;
    }

    // 2. Call datamartgh purchase API
    const apiKey = Deno.env.get("DATAHUB_API_KEY");
    const purchasePayload = {
      phoneNumber,
      network,
      capacity: String(capacity),
      gateway: "wallet",
    };
    console.log(`[${requestId}] Calling datamartgh API...`, JSON.stringify(purchasePayload));

    const purchaseRes = await fetch("https://api.datamartgh.shop/api/developer/purchase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey || "",
      },
      body: JSON.stringify(purchasePayload),
    });

    const purchaseData = await purchaseRes.json();
    console.log(`[${requestId}] API response status: ${purchaseRes.status}`, JSON.stringify(purchaseData));

    // 3. Update transaction based on response
    if (purchaseData.status === "success" && purchaseData.data) {
      const d = purchaseData.data;
      console.log(`[${requestId}] Purchase succeeded. OrderStatus: ${d.orderStatus}, PurchaseId: ${d.purchaseId}`);
      const { error: updateError } = await supabase
        .from("data_transactions")
        .update({
          status: d.orderStatus || "completed",
          purchase_id: d.purchaseId,
          order_reference: d.orderReference,
          transaction_reference: d.transactionReference,
          balance_before: d.balanceBefore,
          balance_after: d.balanceAfter,
          processing_method: d.processingMethod,
          error_message: null,
        })
        .eq("id", txnId);
      if (updateError) {
        console.error(`[${requestId}] Failed to update transaction to completed:`, updateError.message);
      } else {
        console.log(`[${requestId}] Transaction ${txnId} updated to completed`);
      }
    } else {
      const errorMsg = purchaseData.message || JSON.stringify(purchaseData);
      console.error(`[${requestId}] Purchase failed: ${errorMsg}`);
      const { error: updateError } = await supabase
        .from("data_transactions")
        .update({
          status: "failed",
          error_message: errorMsg,
        })
        .eq("id", txnId);
      if (updateError) {
        console.error(`[${requestId}] Failed to update transaction to failed:`, updateError.message);
      } else {
        console.log(`[${requestId}] Transaction ${txnId} updated to failed`);
      }
    }

    console.log(`[${requestId}] Request completed`);
    return new Response(JSON.stringify(purchaseData), {
      status: purchaseRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${requestId}] Purchase error:`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
