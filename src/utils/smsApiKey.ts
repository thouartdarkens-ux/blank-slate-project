
import { supabase } from "@/integrations/supabase/client";

let cachedApiKey: string | null = null;

export const getSmsApiKey = async (): Promise<string> => {
  // Return cached key if available
  if (cachedApiKey) {
    return cachedApiKey;
  }

  try {
    const { data, error } = await supabase.functions.invoke('get-api-key', {
      body: { key_name: 'SMS_FUNCTION_API_KEY' }
    });

    if (error) {
      throw new Error(`Failed to get SMS API key: ${error.message}`);
    }

    if (!data?.apiKey) {
      throw new Error('SMS API key not found in response');
    }

    // Cache the key for future use
    cachedApiKey = data.apiKey;
    return cachedApiKey;
  } catch (error) {
    console.error('Error retrieving SMS API key:', error);
    throw new Error('Failed to authenticate SMS request');
  }
};

// Clear cached key (useful for testing or if key changes)
export const clearSmsApiKeyCache = () => {
  cachedApiKey = null;
};
