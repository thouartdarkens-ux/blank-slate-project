
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface EmailRequest {
  sender?: string;
  to: string[];
  subject?: string;
  template_id?: string;
  template_data: any;
  attachments?: Array<{
    filename: string;
    url: string;
  }>;
}

serve(async (req) => {
  console.log(`📧 === SEND-EMAIL FUNCTION START ===`);
  console.log(`📧 Request method: ${req.method}`);
  console.log(`📧 Request URL: ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`📧 ✅ CORS preflight handled`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log(`📧 Request body received:`, JSON.stringify(requestBody, null, 2));
    
    const { 
      sender = 'movaconsult@movachecker.com', 
      to, 
      subject = 'Transaction receipt', 
      template_id = '2963622', 
      template_data,
      attachments = []
    }: EmailRequest = requestBody;

    console.log(`📧 Parsed email parameters:`);
    console.log(`📧 - Sender: ${sender}`);
    console.log(`📧 - To: ${JSON.stringify(to)}`);
    console.log(`📧 - Subject: ${subject}`);
    console.log(`📧 - Template ID: ${template_id}`);
    console.log(`📧 - Template data:`, JSON.stringify(template_data, null, 2));
    console.log(`📧 - Attachments:`, JSON.stringify(attachments, null, 2));

    const smtp2goApiKey = Deno.env.get('emailkey');
    console.log(`📧 SMTP2GO API key status: ${smtp2goApiKey ? 'FOUND' : 'MISSING'}`);

    if (!smtp2goApiKey) {
      console.error('📧 ❌ SMTP2GO API key not configured');
      throw new Error('SMTP2GO API key not configured');
    }

    if (!to || to.length === 0) {
      console.error('📧 ❌ No recipients provided');
      throw new Error('At least one recipient email is required');
    }

    const emailPayload: any = {
      sender: sender,
      to: to,
      subject: subject,
      template_id: template_id,
      template_data: template_data,
      sandbox: false,
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      console.log(`📧 Adding ${attachments.length} attachments to email`);
      emailPayload.attachments = attachments;
    }

    console.log(`📧 📤 Sending email via SMTP2GO API...`);
    console.log(`📧 Email payload:`, JSON.stringify(emailPayload, null, 2));

    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'X-Smtp2go-Api-Key': smtp2goApiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(emailPayload),
    });

    console.log(`📧 SMTP2GO response status: ${response.status}`);
    console.log(`📧 SMTP2GO response ok: ${response.ok}`);

    const data = await response.json();
    console.log('📧 SMTP2GO API full response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error(`📧 ❌ SMTP2GO API error - Status: ${response.status}`);
      console.error(`📧 ❌ SMTP2GO API error - Data:`, data);
      throw new Error(`SMTP2GO API error: ${data.error || 'Unknown error'}`);
    }

    console.log(`📧 ✅ Email sent successfully!`);
    console.log(`📧 Success data:`, JSON.stringify(data, null, 2));
    console.log(`📧 === SEND-EMAIL FUNCTION END (SUCCESS) ===`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email sent successfully',
      data: data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('📧 ❌ Error in send-email function:', error);
    console.error('📧 ❌ Error stack:', error.stack);
    console.log(`📧 === SEND-EMAIL FUNCTION END (ERROR) ===`);
    
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
