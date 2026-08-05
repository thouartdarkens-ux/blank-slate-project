import { supabase } from "@/integrations/supabase/client";

interface BuyCheckerParams {
  phone_number: string;
  product: string;
  quantity: number;
  amount: number;
  reference?: string;
}

// Function to call the buy-checker edge function
export const buyChecker = async (params: BuyCheckerParams) => {
  try {
    const { data, error } = await supabase.functions.invoke('buy-checker', {
      body: params
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in buyChecker:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    };
  }
};

// Function to call the buy-voucher-api endpoint with the new API key
export const buyVoucherAPI = async (params: BuyCheckerParams & { reference: string }) => {
  try {
    // Get price information from voucher_types table before proceeding
    const { data: voucherTypeData, error: voucherTypeError } = await supabase
      .from('voucher_types')
      .select('price, bulk_price')
      .eq('name', params.product)
      .single();
    
    if (voucherTypeError || !voucherTypeData) {
      throw new Error(`Invalid voucher type: ${params.product}`);
    }

    // Calculate expected amount based on quantity and pricing rules
    const { price, bulk_price } = voucherTypeData;
    const usesBulkPrice = params.quantity >= 20 && bulk_price !== null;
    const expectedAmount = params.quantity * (usesBulkPrice ? bulk_price : price);
    
    // Convert both amounts to fixed precision for comparison to handle both integer and float values
    const normalizedExpectedAmount = Number(expectedAmount.toFixed(2));
    const normalizedActualAmount = Number(Number(params.amount).toFixed(2));
    
    // If amount doesn't match expected, record as compromised transaction
    if (normalizedActualAmount !== normalizedExpectedAmount) {
      const result = await recordCompromisedTransaction(params, expectedAmount);
      console.log("Recorded compromised transaction:", result);
      return {
        success: false,
        error: "Transaction amount validation failed. Security alert has been triggered."
      };
    }
    
    // Get the new API key from Supabase
    const { data: secretData, error: secretError } = await supabase.functions.invoke('get-api-key', {
      body: { key_name: 'VOUCHER_API_KEY_NEW' }
    });
    
    if (secretError || !secretData?.api_key) {
      throw new Error('Failed to get API key');
    }

    // Make the request to the buy-voucher-api endpoint
    const response = await fetch('https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/buy-voucher-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': secretData.api_key.trim()
      },
      body: JSON.stringify(params)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to process voucher purchase');
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in buyVoucherAPI:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    };
  }
};

// Function to record compromised transactions
async function recordCompromisedTransaction(params: BuyCheckerParams, expectedAmount: number) {
  try {
    // Record transaction as compromised
    const { data: transactionData, error: transactionError } = await supabase.from('transactions').insert({
      reference: params.reference || `manual-${Date.now()}`,
      phone_number: params.phone_number,
      product: params.product,
      quantity: params.quantity,
      amount: params.amount,
      status: 'compromised'
    }).select('id');
    
    if (transactionError) {
      console.error("Error creating compromised transaction:", transactionError);
      throw transactionError;
    }
    
    console.log("Created compromised transaction:", transactionData);
    
    // Create security alert
    const { data: alertData, error: alertError } = await supabase.from('alerts').insert({
      type: 'malicious_activity',
      message: `Potential malicious activity detected: Amount mismatch for ${params.product} purchase`,
      status: 'new',
      data: {
        expected_amount: expectedAmount,
        provided_amount: params.amount,
        product: params.product,
        quantity: params.quantity,
        phone_number: params.phone_number,
        reference: params.reference || `manual-${Date.now()}`
      }
    }).select('id');
    
    if (alertError) {
      console.error("Error creating security alert:", alertError);
      throw alertError;
    }
    
    console.log("Created security alert:", alertData);
    
    return { transaction: transactionData, alert: alertData };
  } catch (error) {
    console.error("Failed to record security violation:", error);
    throw error;
  }
}
