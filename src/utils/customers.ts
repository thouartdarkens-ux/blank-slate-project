
import { supabase } from "@/integrations/supabase/client";

export const syncCustomersFromTransactions = async () => {
  try {
    console.log("Starting customer sync process...");
    const { data, error } = await supabase.rpc('sync_customers_from_transactions');
    
    if (error) {
      console.error("Error syncing customers:", error);
      throw error;
    }
    
    console.log("Sync completed successfully", data);
    return { success: true };
  } catch (error) {
    console.error("Error in syncCustomersFromTransactions:", error);
    throw error;
  }
};

// Run the sync immediately when this module loads
syncCustomersFromTransactions()
  .then(() => console.log("Initial customer sync completed"))
  .catch(error => console.error("Error during initial sync:", error));
