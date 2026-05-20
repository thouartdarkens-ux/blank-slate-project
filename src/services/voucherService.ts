
import { supabase } from '@/integrations/supabase/client';

/**
 * Purchase a voucher by sending the required data to the API endpoint
 */
export const purchaseVoucher = async (reference: string, phoneNumber: string, product: string, quantity: number, amount: number) => {
  try {
    console.log('Purchasing voucher:', { reference, phoneNumber, product, quantity, amount });
    
    // Get API key from Supabase function
    const apiResponse = await supabase.functions.invoke('get-voucher-api-key', {
      method: 'POST',
    });
    
    if (!apiResponse.data || !apiResponse.data.apiKey) {
      console.error('Failed to get API key for voucher purchase');
      return { success: false, error: 'Failed to get API key' };
    }
    
    const apiKey = apiResponse.data.apiKey;
    
    const response = await fetch('https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/buy-voucher-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        reference,
        phone_number: phoneNumber,
        product,
        quantity,
        amount
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error purchasing voucher:', error);
      return { success: false, error };
    }

    const data = await response.json();
    console.log('Voucher purchase successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error in voucher purchase:', error);
    return { success: false, error };
  }
};
