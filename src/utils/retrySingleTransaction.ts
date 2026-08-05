import { supabase } from "@/integrations/supabase/client";

export const retrySingleTransaction = async (transactionId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('buy-voucher-api/retry-single', {
      body: { transaction_id: transactionId }
    });

    if (error) {
      throw new Error(`Failed to retry transaction: ${error.message}`);
    }

    return {
      success: true,
      message: data.message || 'Transaction processed successfully',
      data
    };
  } catch (error) {
    console.error('Error retrying transaction:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retry transaction',
      error
    };
  }
};
