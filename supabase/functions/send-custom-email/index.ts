
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      sender = 'movaconsult@movachecker.com', 
      to, 
      subject,
      text_body,
      custom_headers = [],
      attachments = []
    }: CustomEmailRequest = await req.json();

    const smtp2goApiKey = Deno.env.get('emailkey');

    if (!smtp2goApiKey) {
      throw new Error('SMTP2GO API key not configured');
    }

    if (!to || to.length === 0) {
      throw new Error('At least one recipient email is required');
    }

    if (!subject || !text_body) {
      throw new Error('Subject and text body are required');
    }

    console.log('Sending custom email to:', to);
    console.log('Subject:', subject);
    console.log('Custom headers:', custom_headers);
    console.log('Attachments:', attachments);

    // Prepare the email payload
    const emailPayload: any = {
      sender: sender,
      to: to,
      subject: subject,
      text_body: text_body,
      sandbox: false,
    };

    // Add custom headers if provided
    if (custom_headers && custom_headers.length > 0) {
      emailPayload.custom_headers = custom_headers;
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      emailPayload.attachments = attachments;
    }

    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'X-Smtp2go-Api-Key': smtp2goApiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await response.json();
    console.log('SMTP2GO API response:', data);

    if (!response.ok) {
      throw new Error(`SMTP2GO API error: ${data.error || 'Unknown error'}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Custom email sent successfully',
      data: data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error sending custom email:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
