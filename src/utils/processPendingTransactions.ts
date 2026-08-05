
import { supabase } from "@/integrations/supabase/client";

export const processPendingTransactions = async () => {
  try {
    // The correct way to call the function with a specific path
    // Use the path parameter instead of url
    const { data, error } = await supabase.functions.invoke('buy-voucher-api/check-pending', {
      body: {}
    });

    if (error) {
      throw new Error(`Failed to process pending transactions: ${error.message}`);
    }

    return {
      success: true,
      message: data.message || 'Pending transactions processed',
      data
    };
  } catch (error) {
    console.error('Error processing pending transactions:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process pending transactions',
      error
    };
  }
};
