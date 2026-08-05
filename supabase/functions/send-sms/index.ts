
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

interface SendSMSRequest {
  message: string;
  recipients: string[];
  senderId?: string;
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
      console.error('SMS API Key validation failed');
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
    
    console.log('=== SMS REQUEST TRACKING ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User-Agent:', userAgent);
    console.log('Referer:', referer);
    console.log('Authorization:', authorization);
    console.log('Client-Info:', clientInfo);
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('API Key Status: VALID');

    const { message, recipients, senderId = 'MOVAconsult', source, context }: SendSMSRequest = await req.json()
    
    // Log source tracking information
    console.log('Source:', source || 'not-specified');
    console.log('Context:', context || 'not-specified');
    console.log('Recipients count:', recipients.length);
    console.log('Sender ID:', senderId);
    console.log('Message preview:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
    
    const arkeselApiKey = Deno.env.get('ARKESEL_API_KEY')

    if (!arkeselApiKey) {
      throw new Error('Arkesel API key not configured')
    }

    console.log('Sending SMS to:', recipients)
    console.log('Message:', message)
    console.log('Sender ID:', senderId)

    const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: {
        'api-key': arkeselApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
        message: message,
        recipients: recipients,
        sandbox: false,
      }),
    })

    const data = await response.json()
    console.log('Arkesel API response:', data)
    console.log('=== END SMS REQUEST ===');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in send-sms function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})
