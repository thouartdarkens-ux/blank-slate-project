
interface SendSMSParams {
  message: string;
  recipients: string[];
  senderId?: string;
}
const MNOTIFY_API_KEY = Deno.env.get('MNOTIFY_API_KEY') ?? 'U9tYHZivslD9dMBEv3tOrp7C8';

async function sendMnotifyALertSMS({ message, recipients,senderId }: { message: string; recipients: string[]; senderId?: string }) {
  const url = `https://api.mnotify.com/api/sms/quick?key=${MNOTIFY_API_KEY}`;
  const body = {
    recipient: recipients,
    sender: senderId,
    message,
    is_schedule: false,
    schedule_date: ""
  };
  console.log('📲 mNotify send ->', { recipients, sender:senderId, preview: message.slice(0, 80) });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('mNotify error', res.status, text);
    throw new Error(`mNotify failed ${res.status}: ${text}`);
  }
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export const sendSMS = async ({ message, recipients, senderId = 'MOVAconsult' }: SendSMSParams) => {
  const apiKey = Deno.env.get('ARKESEL_API_KEY')
  
  if (!apiKey) {
    throw new Error('Arkesel API key not configured')
  }

  console.log('Sending SMS to:', recipients)
  console.log('Message:', message)
  console.log('Sender ID:', senderId)
  
  const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: senderId,
      message: message,
      recipients: recipients,
      sandbox: false,
    }),
  })
// Read raw response first
  const text = await response.text();
  console.log("arkeselrespons",text)
  if (!response.ok) {
    console.error("SMS API error:", response.status, text);
    throw new Error(`SMS API failed with ${response.status}`);
  }
  // Try parsing as JSON
  let data;
  try {
    data = JSON.parse(text);
  } catch  {
    console.error("SMS API did not return JSON:", text);
    throw new Error("Unexpected response format from SMS API");
  }
  return data;
}

// Specific function for sending alerts with MOVAalerts sender ID
export const sendAlertSMS = async ({ message, recipients }: Omit<SendSMSParams, 'senderId'>) => {
  return sendMnotifyALertSMS({
    message,
    recipients,
    senderId: 'MOVAalerts'
  })
}

// Specific function for sending vouchers with MOVAconsult sender ID
export const sendVoucherSMS = async ({ message, recipients }: Omit<SendSMSParams, 'senderId'>) => {
  return sendMnotifyALertSMS({
    message,
    recipients,
    senderId: 'MOVAconsult'
  })
}
