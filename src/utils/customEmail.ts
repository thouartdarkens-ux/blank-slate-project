
import { supabase } from "@/integrations/supabase/client";

interface CustomEmailRequest {
  sender?: string;
  to: string[];
  subject: string;
  text_body: string;
  custom_headers?: Array<{
    header: string;
    value: string;
  }>;
  attachments?: Array<{
    filename: string;
    url: string;
  }>;
}

export const sendCustomEmail = async (emailData: CustomEmailRequest) => {
  try {
    console.log('Sending custom email:', emailData);
    
    const { data, error } = await supabase.functions.invoke('send-custom-email', {
      body: emailData
    });

    if (error) {
      console.error('Error calling send-custom-email function:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to send email');
    }

    console.log('Email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in sendCustomEmail:', error);
    throw error;
  }
};
