
import { supabase } from "@/integrations/supabase/client";
import { getSmsApiKey } from "./smsApiKey";

interface SendScheduledSMSParams {
  message: string;
  recipients: string[];
  senderId?: string;
  scheduleTime: string; // Format: YYYY-MM-DD HH:mm:ss
  source?: string;
  context?: string;
}

export const sendScheduledSMS = async ({ message, recipients, senderId = 'MOVAconsult', scheduleTime, source, context }: SendScheduledSMSParams) => {
  try {
    // Get the SMS API key
    const apiKey = await getSmsApiKey();

    const { data, error } = await supabase.functions.invoke('send-scheduled-sms', {
      body: { 
        message, 
        recipients, 
        senderId, 
        scheduleTime,
        source: source || 'frontend-utils',
        context: context || 'scheduled-message'
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
    console.error('Error sending scheduled SMS:', error);
    throw error;
  }
};
