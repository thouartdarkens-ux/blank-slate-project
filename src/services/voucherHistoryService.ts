
import { supabase } from '@/integrations/supabase/client';

interface VoucherHistoryResponse {
  success: boolean;
  data?: any;
  message?: string;
}

export async function fetchVoucherHistory(reference: string): Promise<VoucherHistoryResponse> {
  try {
    console.log("Calling our own edge function for voucher history with reference:", reference);
    
    // Call our own edge function that handles CORS properly
    // We'll pass the reference in the body instead of as a query parameter
    const { data, error } = await supabase.functions.invoke('get-voucher-history', {
      method: 'POST',
      body: { reference }
    });
    
    if (error) {
      console.error("Edge function error:", error);
      return { 
        success: false, 
        message: `Failed to fetch voucher history: ${error.message}` 
      };
    }

    console.log("Voucher history fetched:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch voucher history:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch voucher history'
    };
  }
}
