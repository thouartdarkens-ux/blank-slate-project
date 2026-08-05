
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

interface ScheduledSMSRequest {
  message: string;
  recipients: string[];
  senderId?: string;
  scheduleTime: string;
  source?: string;
  context?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // API key validation
    const apiKey = req.headers.get('x-api-key')?.trim();
    const expectedApiKey = Deno.env.get('SMS_FUNCTION_API_KEY')?.trim();
    
    console.log("API Key validation:", apiKey ? "Present" : "Missing");
    console.log("Expected API key exists:", expectedApiKey ? "Yes" : "No");
    
    if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
      console.error('Scheduled SMS API Key validation failed');
      return new Response(JSON.stringify({
        error: 'Unauthorized - Invalid or missing API key'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log request details for tracking
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const referer = req.headers.get('referer') || 'unknown';
    const authorization = req.headers.get('authorization') ? 'present' : 'none';
    const clientInfo = req.headers.get('x-client-info') || 'unknown';
    
    console.log('=== SCHEDULED SMS REQUEST TRACKING ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User-Agent:', userAgent);
    console.log('Referer:', referer);
    console.log('Authorization:', authorization);
    console.log('Client-Info:', clientInfo);
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('API Key Status: VALID');

    const { message, recipients, senderId = 'MOVAconsult', scheduleTime, source, context }: ScheduledSMSRequest = await req.json()
    
    // Log source tracking information
    console.log('Source:', source || 'not-specified');
    console.log('Context:', context || 'not-specified');
    console.log('Recipients count:', recipients.length);
    console.log('Sender ID:', senderId);
    console.log('Schedule Time:', scheduleTime);
    console.log('Message preview:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
    
    const arkeselApiKey = Deno.env.get('ARKESEL_API_KEY')

    if (!arkeselApiKey) {
      throw new Error('Arkesel API key not configured')
    }

    console.log('Scheduling SMS to:', recipients)
    console.log('Schedule time:', scheduleTime)
    console.log('Message:', message)
    console.log('Sender ID:', senderId)

    // Convert recipients array to comma-separated string
    const recipientsString = recipients.join(',')

    // Use the legacy Arkesel API endpoint for scheduled messages
    const endpoint = `https://sms.arkesel.com/sms/api?action=send-sms&api_key=${arkeselApiKey}&to=${recipientsString}&from=${senderId}&sms=${encodeURIComponent(message)}&schedule=${encodeURIComponent(scheduleTime)}`
    
    const response = await fetch(endpoint, {
      method: 'GET',
    })

    const responseText = await response.text()
    console.log('Arkesel API response:', responseText)

    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseText)
    } catch (e) {
      parsedResponse = { raw: responseText }
    }

    console.log('=== END SCHEDULED SMS REQUEST ===');

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in send-scheduled-sms function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})
