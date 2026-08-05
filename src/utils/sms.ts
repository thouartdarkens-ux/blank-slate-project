
import { supabase } from "@/integrations/supabase/client";
import { getSmsApiKey } from "./smsApiKey";

interface SendSMSParams {
  message: string;
  recipients: string[];
  senderId?: string;
  source?: string;
  context?: string;
}

export const sendSMS = async ({ message, recipients, senderId = 'MOVAconsult', source, context }: SendSMSParams) => {
  try {
    // Get the SMS API key
    const apiKey = await getSmsApiKey();

    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: { 
        message, 
        recipients, 
        senderId,
        source: source || 'frontend-utils',
        context: context || 'manual-call'
      },
      headers: {
        'X-API-Key': apiKey
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};
