
/**
 * Mobile Money payment payload interface
 * Represents the mobile money-specific parameters required by the payment API
 */
interface MobileMoneyPayload {
  phone: string;    // Customer's mobile money phone number
  provider: string; // Mobile network operator code (mtn, vod, atl)
}

/**
 * Complete payment request payload interface
 * Contains all parameters needed to initiate a mobile money payment
 */
interface PaymentRequestPayload {
  amount: number;                 // Payment amount in pesewas (multiply by 100)
  email: string;                 // Customer email address
  currency: string;              // Currency code (GHS for Ghana Cedis)
  mobile_money: MobileMoneyPayload; // Mobile money details
}

import { supabase } from '@/integrations/supabase/client';

/**
 * Initiates a mobile money payment request using Supabase Edge Function
 */
export const initiatePayment = async (
  amount: number,
  email: string,
  phoneNumber: string,
  provider: string
): Promise<{ success: boolean; reference?: string; error?: string }> => {
  try {
    console.log(`Initiating payment: amount=${amount}, email=${email}, phone=${phoneNumber}, provider=${provider}`);
    
    const { data, error } = await supabase.functions.invoke('process-payment', {
      body: {
        amount,
        email,
        phoneNumber,
        provider,
      },
    });

    console.log('Payment function response:', data);

    if (error) {
      console.error('Function invocation error:', error);
      throw new Error(error.message || 'Payment initiation failed');
    }

    if (!data.success) {
      throw new Error(data.error || 'Payment initiation failed');
    }

    return {
      success: true,
      reference: data.reference,
    };
  } catch (error) {
    console.error('Payment initiation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment initiation failed',
    };
  }
};
