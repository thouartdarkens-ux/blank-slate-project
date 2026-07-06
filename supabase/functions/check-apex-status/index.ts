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
  console.log(`[${requestId}] check-apex-status: Request received`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apexAuth = Deno.env.get("APEX_AUTH_TOKEN")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all non-completed telecel transactions
    const { data: transactions, error } = await supabase
      .from("data_transactions")
      .select("id, order_reference, status, network, transaction_reference, paystack_id")
      .ilike("network", "telecel")
      .neq("status", "completed");

    if (error) throw error;

    console.log(`[${requestId}] Found ${transactions.length} Telecel transactions to check`);

    const results: Array<{ id: string; order_reference: string | null; apex_status: any; updated: boolean }> = [];

    for (const txn of transactions) {
      // Use order_reference if available, otherwise fall back to transaction_reference/paystack_id
      const lookupRef = txn.order_reference || txn.transaction_reference || txn.paystack_id;
      if (!lookupRef) {
        console.log(`[${requestId}] Skipping ${txn.id}: no reference to look up`);
        results.push({ id: txn.id, order_reference: null, apex_status: { skipped: "no reference" }, updated: false });
        continue;
      }

      try {
        const url = new URL("https://apexdatagh.com/wp-json/custom-api/v1/check-order-status");
        url.searchParams.set("order_reference", lookupRef);
        url.searchParams.set("uid", "ra6434829@gmail.com");

        const res = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Authorization": `Basic ${apexAuth}`,
          },
        });

        const apexData = await res.json();
        console.log(`[${requestId}] Order ${lookupRef}: ${JSON.stringify(apexData)}`);

        // Update transaction status based on apex response message
        let newStatus: string | null = null;
        let errorMessage: string | null = null;
        let orderRef: string | null = null;

        if (apexData.message === "Order is completed." || apexData.status === "completed" || apexData.status === "success" || apexData.status === true) {
          newStatus = "completed";
          errorMessage = "Delivered successfully (Apex verified)";
          orderRef = apexData.order_id || apexData.reference || null;
        } else if (apexData.message === "Order not completed." || apexData.status === "pending" || apexData.status === "processing") {
          newStatus = "pending";
          errorMessage = apexData.message || "Still processing";
        } else if (apexData.status === "failed" || apexData.status === "error") {
          newStatus = "failed";
          errorMessage = apexData.message || "Failed (Apex verified)";
        }

        let updated = false;
        if (newStatus && newStatus !== txn.status) {
          const updateData: Record<string, any> = { status: newStatus, error_message: errorMessage };
          // Also save order_reference if we got one and didn't have one before
          if (orderRef && !txn.order_reference) {
            updateData.order_reference = orderRef;
          }
          const { error: updateError } = await supabase
            .from("data_transactions")
            .update(updateData)
            .eq("id", txn.id);

          if (updateError) {
            console.error(`[${requestId}] Failed to update ${txn.id}:`, updateError);
          } else {
            updated = true;
          }
        }

        results.push({
          id: txn.id,
          order_reference: lookupRef,
          apex_status: apexData,
          updated,
        });
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error(`[${requestId}] Error checking ${lookupRef}:`, e);
        results.push({
          id: txn.id,
          order_reference: lookupRef,
          apex_status: { error: errMsg },
          updated: false,
        });
      }
    }

    const updatedCount = results.filter((r) => r.updated).length;

    return new Response(
      JSON.stringify({
        status: "success",
        total: transactions.length,
        updated: updatedCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[${requestId}] Error:`, err);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
