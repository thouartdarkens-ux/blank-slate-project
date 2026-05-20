
import { VoucherType } from "@/types/voucher";
import { supabase } from '@/integrations/supabase/client';

const VOUCHER_API_ENDPOINT = "https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/get-voucher-types";

export interface VoucherTypeResponse {
  success: boolean;
  data: VoucherType[];
  bulkPriceNote?: string;
}

export async function fetchVoucherTypes(): Promise<VoucherTypeResponse> {
  try {
    // Get API key from Supabase function
    const apiResponse = await supabase.functions.invoke('get-voucher-api-key', {
      method: 'POST',
    });
    
    if (!apiResponse.data || !apiResponse.data.apiKey) {
      console.error('Failed to get API key');
      return { success: false, data: [] };
    }
    
    const apiKey = apiResponse.data.apiKey;
    
    const response = await fetch(VOUCHER_API_ENDPOINT, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Voucher types fetched:", data);
    return data as VoucherTypeResponse;
  } catch (error) {
    console.error("Failed to fetch voucher types:", error);
    return { success: false, data: [] };
  }
}
