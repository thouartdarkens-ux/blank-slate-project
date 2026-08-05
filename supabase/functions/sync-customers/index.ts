
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { supabaseClient } from "../_shared/supabase-client.ts";

serve(async (req) => {
  try {
    console.log("Running customer sync from edge function");
    
    // Call the sync_customers_from_transactions function
    const { data, error } = await supabaseClient.rpc('sync_customers_from_transactions');
    
    if (error) {
      console.error("Error syncing customers:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { 
          headers: { "Content-Type": "application/json" },
          status: 500
        }
      );
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Customer sync completed successfully"
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
