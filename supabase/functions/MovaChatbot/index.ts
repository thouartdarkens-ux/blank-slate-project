import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHATBOT_API_KEY = "d863d448-ddf3-49cc-abd3-b959a6ded853";
const LIST_URL = "https://api.chatbotsafrica.com/api/v1.0/send/list/message";
const REPLY_URL = "https://api.chatbotsafrica.com/api/v1.0/send/reply/message";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const UPDATES_MSG =
  "Dial *920*138# for BECE news. Likely Release Date: 15 July 2026. Current Step: Result Quality check. WhatsApp: 0557956020 (Final Result only).";
const CONTACT_MSG = "Contact details: 0241840979 / 0538848199";

// ---------- Moolre payment ----------

const MOOLRE_URL = "https://api.moolre.com/open/transact/payment";
const MOOLRE_API_USER = "movaconsult";
const MOOLRE_API_PUBKEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyaWQiOjEwODE1NCwiZXhwIjoxOTU2NTQ1OTk5fQ.clDRhYtPhcBAZhXDo-sIkSNiFEEbHWUTB770KdW8XY0";
const MOOLRE_ACCOUNT_NUMBER = "10815406072900";

function networkToChannel(network: string): string {
  switch (network.toUpperCase()) {
    case "MTN": return "13";
    case "TELECEL":
    case "VODAFONE": return "6";
    case "AT":
    case "AIRTELTIGO": return "7";
    default: return "13";
  }
}

// Detect Ghanaian MoMo network from phone prefix.
// MTN: 024, 054, 055, 059, 025, 053
// Telecel (Vodafone): 020, 050
// AirtelTigo: 026, 056, 027, 057
function detectNetwork(phone: string): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("233") && local.length === 12) local = "0" + local.slice(3);
  const p = local.slice(0, 3);
  if (["024", "054", "055", "059", "025", "053"].includes(p)) return "MTN";
  if (["020", "050"].includes(p)) return "TELECEL";
  if (["026", "056", "027", "057"].includes(p)) return "AT";
  return null;
}

async function moolrePay({
  payer,
  amount,
  network,
  externalref,
  reference,
  otpcode,
  metadata,
}: {
  payer: string;
  amount: number;
  network: string;
  externalref: string;
  reference: string;
  otpcode: string;
  metadata?: Record<string, any>;
}): Promise<any> {
  const body: Record<string, any> = {
    type: 1,
    channel: networkToChannel(network),
    currency: "GHS",
    payer,
    amount: amount.toFixed(2),
    externalref,
    otpcode,
    reference,
    sessionid: "",
    accountnumber: MOOLRE_ACCOUNT_NUMBER,
  };
  // if (metadata) body.reference = metadata;
  console.log("[moolre] request:", body);
  const res = await fetch(MOOLRE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-USER": MOOLRE_API_USER,
      "X-API-PUBKEY": MOOLRE_API_PUBKEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log("[moolre] response:", res.status, text);
  try { return JSON.parse(text); } catch { return {}; }
}

const PAYMENT_APPROVE_MSG =
  "Your purchase has been initiated. Please approve the MoMo prompt to confirm.\nDial *170# to approve on MTN/ *110# on Telecel if the prompt delays.";

async function runMoolreFlow(
  phone: string,
  messageId: string,
  ctx: { payer: string; amount: number; network: string; externalref: string; reference: string; otpcode: string; metadata?: Record<string, any> },
): Promise<{ nextStage: string | null; data?: Record<string, any> }> {
  const resp = await moolrePay(ctx);
  const code = resp?.code;
  if (code === "TP14") {
    await sendReply(phone, "An OTP has been sent to your phone via SMS. Please enter the OTP code:", messageId);
    return { nextStage: "PAYMENT_OTP", data: { ...ctx } };
  }
  if (code === "TP17") {
    const resp2 = await moolrePay(ctx);
    if (resp2?.code === "TR099") {
      await sendReply(phone, PAYMENT_APPROVE_MSG, messageId);
      return { nextStage: null };
    }
    await sendReply(
      phone,
      `Payment could not be completed (${resp2?.code ?? "unknown"}). Please try again or contact support: 0557956020`,
      messageId,
    );
    return { nextStage: null };
  } else if (ctx.otpcode) {
    await sendReply(phone, "Invalid OTP. Please enter the correct OTP code sent via SMS:", messageId);
    return { nextStage: "PAYMENT_OTP", data: { ...ctx, otpcode: "" } };
  }
  if (code === "TR099") {
    await sendReply(phone, PAYMENT_APPROVE_MSG, messageId);
    return { nextStage: null };
  }
  await sendReply(
    phone,
    `Payment could not be initiated (${code ?? "unknown"}). Please try again or contact support: 0557956020`,
    messageId,
  );
  return { nextStage: null };
}

// ---------- Menu definitions ----------

function buildMainMenuInteractive() {
  return {
    type: "list",
    title: "MOVA CONSULT",
    body: "Welcome to MOVA CONSULT. Choose an option from the menu below.",
    msgid: "main_menu",
    globalButtons: [{ type: "text", title: "View Menu" }],
    items: [
      {
        title: "Main Menu",
        options: [
          { title: "Buy BECE Checker", postbackText: "1" },
          { title: "Buy WASSCE/NOVDEC", postbackText: "2" },
          { title: "Retrieve Checkers", postbackText: "3" },
          { title: "Contact support", postbackText: "5" },
        ],
      },
    ],
  };
}

function buildNetworkMenuInteractive() {
  return {
    type: "list",
    title: "Select Network",
    body: "Select your MoMo network to complete payment.",
    msgid: "network_menu",
    globalButtons: [{ type: "text", title: "Select Network" }],
    items: [
      {
        title: "MoMo Network",
        options: [
          { title: "MTN", postbackText: "MTN" },
          { title: "Vodafone", postbackText: "VODAFONE" },
          { title: "AirtelTigo", postbackText: "AIRTELTIGO" },
        ],
      },
    ],
  };
}

// ---------- Payload extractors ----------

function normalizePhone(waId: string): string {
  if (!waId) return waId;
  const digits = waId.replace(/\D/g, "");
  if (digits.startsWith("233") && digits.length === 12) return "0" + digits.slice(3);
  return digits;
}

function extractPhone(payload: any): string | null {
  const msg = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const contact = payload?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
  const from = msg?.from ?? contact?.wa_id;
  return from ? normalizePhone(from) : null;
}

function extractMessageId(payload: any): string | null {
  return payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ?? null;
}

function hasInboundMessage(payload: any): boolean {
  return !!payload?.entry?.[0]?.changes?.[0]?.value?.messages?.length;
}

function extractUserInput(payload: any): string {
  const msg = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return "";
  if (msg.type === "text") return (msg.text?.body ?? "").trim();
  if (msg.type === "interactive") {
    const inter = msg.interactive;
    return (
      inter?.list_reply?.id ??
      inter?.list_reply?.title ??
      inter?.button_reply?.id ??
      inter?.button_reply?.title ??
      ""
    ).toString().trim();
  }
  if (msg.type === "button") return (msg.button?.payload ?? msg.button?.text ?? "").toString().trim();
  return "";
}

// ---------- Outbound senders ----------

async function sendListMenu(destination: string): Promise<void> {
  const body = {
    apikey: CHATBOT_API_KEY,
    destination,
    interactive: JSON.stringify(buildMainMenuInteractive()),
  };
  console.log("[MovaChatbot] sending list menu to:", destination);
  const res = await fetch(LIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log("[MovaChatbot] list menu response:", res.status, await res.text());
}

async function sendNetworkMenu(destination: string): Promise<void> {
  const body = {
    apikey: CHATBOT_API_KEY,
    destination,
    interactive: JSON.stringify(buildNetworkMenuInteractive()),
  };
  console.log("[MovaChatbot] sending network menu to:", destination);
  const res = await fetch(LIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log("[MovaChatbot] network menu response:", res.status, await res.text());
}

async function sendReply(destination: string, message: string, replyToMessageId: string): Promise<void> {
  const body = {
    apikey: CHATBOT_API_KEY,
    destination,
    message_id: replyToMessageId,
    message,
  };
  console.log("[MovaChatbot] sending reply to:", destination, "msg:", message.slice(0, 80));
  const res = await fetch(REPLY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log("[MovaChatbot] reply response:", res.status, await res.text());
}

// ---------- Session helpers ----------

async function getSession(phone: string): Promise<{ stage: string; data: Record<string, any> }> {
  const { data } = await supabaseAdmin
    .from("chatbot_sessions")
    .select("stage, session_data")
    .eq("phone_number", phone)
    .maybeSingle();
  return data
    ? { stage: data.stage as string, data: (data.session_data ?? {}) as Record<string, any> }
    : { stage: "MENU", data: {} };
}

async function saveSession(phone: string, stage: string, data: Record<string, any> = {}): Promise<void> {
  await supabaseAdmin
    .from("chatbot_sessions")
    .upsert(
      { phone_number: phone, stage, session_data: data, updated_at: new Date().toISOString() },
      { onConflict: "phone_number" },
    );
}

async function clearSession(phone: string): Promise<void> {
  await supabaseAdmin.from("chatbot_sessions").delete().eq("phone_number", phone);
}

// ---------- External API helpers (mirrors naloussd) ----------

async function retreivevouch(reference: string): Promise<void> {
  const response = await fetch(
    `https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/get-voucher-history-phone?phone=${reference}`,
    {
      method: "POST",
      headers: {
        "x-api-key": "XBJtnhGpuZ9FzJVzNY2V3AvH03ohjOYi",
        "Content-Type": "application/json",
      },
    },
  );
  const data = await response.json();
  const retreived = data?.vouchers
  const error=data?.error
  
  console.log("[MovaChatbot] retreivevouch response:", data);
  return data
}

async function linkemail(phoneNumber: string, email: string): Promise<void> {
  const response = await fetch(
    `https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/phone-email-api`,
    {
      method: "POST",
      headers: {
        "x-api-key": "XBJtnhGpuZ9FzJVzNY2V3AvH03ohjOYi",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone_number: phoneNumber, email }),
    },
  );
  const data = await response.json();
  console.log("[MovaChatbot] linkemail response:", data);
}

async function retreiveEmail(phoneNumber: string): Promise<string | null> {
  const response = await fetch(
    `https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/phone-email-api?phone_number=${phoneNumber}`,
    {
      method: "GET",
      headers: {
        "x-api-key": "XBJtnhGpuZ9FzJVzNY2V3AvH03ohjOYi",
        "Content-Type": "application/json",
      },
    },
  );
  const data = await response.json();
  console.log("[MovaChatbot] retreiveEmail response:", data);
  return data?.email ?? null;
}

// ---------- Deduplication ----------

async function claimMessageId(messageId: string, phone: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("chatbot_processed_messages")
    .insert({ message_id: messageId, phone_number: phone });
  if (!error) return true;
  if ((error as any)?.code === "23505") {
    console.log("[MovaChatbot] duplicate message_id, skipping:", messageId);
    return false;
  }
  console.error("[MovaChatbot] dedupe insert error, skipping to be safe:", error);
  return false;
}

// ---------- Conversation flow ----------

async function handleConversation(payload: any): Promise<void> {
  const phone = extractPhone(payload);
  const messageId = extractMessageId(payload);
  const userInput = extractUserInput(payload);

  if (!phone) {
    console.warn("[MovaChatbot] no phone number in payload");
    return;
  }
  if (!hasInboundMessage(payload)) {
    console.log("[MovaChatbot] no inbound message (status update), skipping");
    return;
  }
  if (!messageId) {
    console.warn("[MovaChatbot] no message_id; skipping to avoid duplicates");
    return;
  }

  const claimed = await claimMessageId(messageId, phone);
  if (!claimed) return;

  const trigger = userInput.toLowerCase();

  if (["menu", "main menu", "hi", "hello", "start"].includes(trigger)) {
    await saveSession(phone, "MENU");
    await sendListMenu(phone);
    return;
  }

  const session = await getSession(phone);
  console.log(`[MovaChatbot] phone=${phone} stage=${session.stage} input="${userInput}"`);

  switch (session.stage) {

    // ── Main menu ──────────────────────────────────────────────────────────
    case "MENU": {
      switch (userInput) {
        case "1":
          await saveSession(phone, "BECE_QTY");
          await sendReply(phone, "Enter number of BECE checkers to buy:", messageId);
          return;
        case "2":
          await saveSession(phone, "WASSCE_QTY");
          await sendReply(phone, "Enter number of WASSCE/NOVDEC checkers to buy:", messageId);
          return;
        case "3":
          await saveSession(phone, "RETRIEVE");
          await sendReply(phone, "Please enter Momo number used in voucher purchase", messageId);
          return;
        case "5":
          await clearSession(phone);
          await sendReply(phone, CONTACT_MSG, messageId);
          return;
        default:
          await sendListMenu(phone);
          return;
      }
    }

    // ── Quantity entry ─────────────────────────────────────────────────────
    case "BECE_QTY":
    case "WASSCE_QTY": {
      const qty = parseInt(userInput, 10);
      if (isNaN(qty) || qty < 1) {
        await sendReply(phone, "Invalid quantity. Please enter a valid number.", messageId);
        return;
      }
      if (qty > 5) {
        await sendReply(phone, "You can only purchase a maximum of 5 vouchers per transaction. Please enter a number between 1 and 5.", messageId);
        return;
      }
      const product = session.stage === "BECE_QTY" ? "bece" : "wassce";
      const price = 25;
      const total = qty * price;
      await saveSession(phone, `${product.toUpperCase()}_CONFIRM`, { qty, total, product });
      await sendReply(
        phone,
        `You are purchasing ${qty} ${product.toUpperCase()} result checker(s) for GHC${total.toFixed(2)}\n1. Confirm\n2. Cancel\n0. Main menu`,
        messageId,
      );
      return;
    }

    // ── Confirm purchase → auto-detect network & initiate Moolre payment ──
    case "BECE_CONFIRM":
    case "WASSCE_CONFIRM": {
      if (userInput === "1") {
        const { qty, total, product } = session.data;
        const network = detectNetwork(phone);
        if (!network) {
          await clearSession(phone);
          await sendReply(
            phone,
            "We could not detect your mobile network from your number. Please contact support: 0557956020",
            messageId,
          );
          return;
        }
        const externalref = `MV-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        const reference = externalref;

        // Record the transaction before calling Moolre so the webhook can
        // look it up by externalref after payment success.
        try {
          const { error: recErr } = await supabaseAdmin
            .from("BOTtransactions")
            .insert({
              external_ref: externalref,
              product: (product as string).toUpperCase(),
              quantity: qty,
              phone_number: phone,
              amount: total as number,
              network: network.toUpperCase(),
              status: "PENDING",
            });
          if (recErr) {
            console.error(`[MovaChatbot] BOTtransactions insert error:`, recErr);
            await clearSession(phone);
            await sendReply(phone, "Could not start transaction. Please try again or contact support: 0557956020", messageId);
            return;
          }
        } catch (recErr) {
          console.error(`[MovaChatbot] BOTtransactions insert exception:`, recErr);
          await clearSession(phone);
          await sendReply(phone, "Could not start transaction. Please try again or contact support: 0557956020", messageId);
          return;
        }

        try {
          const ctx = {
            payer: phone,
            amount: total as number,
            network,
            externalref,
            reference,
            otpcode: "",
            metadata: { quantity: qty, product },
          };
          const result = await runMoolreFlow(phone, messageId, ctx);
          if (result.nextStage) {
            await saveSession(phone, result.nextStage, { qty, total, product, ...result.data });
          } else {
            await clearSession(phone);
          }
        } catch (err) {
          console.error(`[MovaChatbot] moolre error:`, err);
          await clearSession(phone);
          await sendReply(phone, "Payment could not be initiated. Please try again or contact support: 0557956020", messageId);
        }
        return;
      }
      if (userInput === "2") {
        await clearSession(phone);
        await sendReply(phone, "Transaction cancelled. Thank you for using MOVA CONSULT.", messageId);
        return;
      }
      if (userInput === "0") {
        await saveSession(phone, "MENU");
        await sendListMenu(phone);
        return;
      }
      await sendReply(phone, "Invalid option. Reply 1 to Confirm, 2 to Cancel, 0 for Main menu.", messageId);
      return;
    }


    // ── OTP entry → retry Moolre payment ──────────────────────────────────
    case "PAYMENT_OTP": {
      const otpcode = userInput.replace(/\D/g, "");
      if (!otpcode) {
        await sendReply(phone, "Invalid OTP. Please enter the numeric OTP code sent via SMS:", messageId);
        return;
      }
      const { payer, amount, network, externalref, reference, qty, product } = session.data;
      try {
        const result = await runMoolreFlow(phone, messageId, {
          payer, amount, network, externalref, reference, otpcode,
          metadata: { quantity: qty, product },
        });
        if (result.nextStage) {
          await saveSession(phone, result.nextStage, { ...session.data, ...result.data });
        } else {
          await clearSession(phone);
        }
      } catch (err) {
        console.error(`[MovaChatbot] moolre otp error:`, err);
        await clearSession(phone);
        await sendReply(phone, "Payment could not be completed. Please try again or contact support: 0557956020", messageId);
      }
      return;
    }


    // ── Retrieve old checker ───────────────────────────────────────────────
    case "RETRIEVE": {
     const vouch :any = await retreivevouch(userInput.trim()).catch((e) => {console.error("[MovaChatbot] retreivevouch error:", e)});
           console.log(vouch)
      const chers = vouch?.vouchers
      const error = vouch?.error
      if(error){
        await clearSession(phone);
      await sendReply(
        phone,
        `No vouchers found for phone number (${userInput}),\n please verify phone number and try again`,
        messageId,
      );
      return;
      }

      if(chers?.length > 1){
       for (const [index, item] of chers.entries()) {
        await clearSession(phone);
        await sendReply(
        phone,
        `(${userInput}) \n${item?.type} Voucher.\nPurchased at ${new Date(item?.sold_at).toLocaleString('en-GH')}. \n SERIAL:${item?.serial} \n PIN:${item?.pin}.\n LINK:${item?.type ==="BECE"?"eresults.waecgh.org":"ghana.waecdirect.org" } \n retreived successfully.`,
        messageId,
      );
        }
         return;
      }else{
      console.log(`[MovaChatbot] Retrieve txnId="${userInput}"`);
      await clearSession(phone);
      await sendReply(
        phone,
        `(${userInput}) \n${chers[0]?.type} Voucher. \n Purchased at ${new Date(chers[0]?.sold_at).toLocaleString('en-GH')}. \n SERIAL:${chers[0]?.serial} \n PIN:${chers[0]?.pin}.\n LINK:${chers[0]?.type ==="BECE"?"eresults.waecgh.org":"ghana.waecdirect.org"} \n retreived successfully.`,
        messageId,
      );
      return;
    }}

    // ── Email sub-menu ─────────────────────────────────────────────────────
    case "EMAIL_MENU": {
      if (userInput === "1") {
        await saveSession(phone, "EMAIL_ENTER");
        await sendReply(phone, "Enter the email you would like to link to this number:", messageId);
        return;
      }
      if (userInput === "2") {
        const email = await retreiveEmail(phone);
        if (!email) {
          await sendReply(phone, "No email is linked to this number yet.", messageId);
        } else {
          await sendReply(phone, `Your linked email is: ${email}`, messageId);
        }
        await clearSession(phone);
        return;
      }
      await sendReply(phone, "Invalid option.\n1. Link a new email\n2. View existing email", messageId);
      return;
    }

    // ── Email entry ────────────────────────────────────────────────────────
    case "EMAIL_ENTER": {
      const email = userInput;
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        await sendReply(phone, "That does not look like a valid email. Please try again.", messageId);
        return;
      }
      linkemail(phone, email).catch((e) => console.error("[MovaChatbot] linkemail error:", e));
      console.log(`[MovaChatbot] Linking email="${email}" for ${phone}`);
      await clearSession(phone);
      await sendReply(phone, `Email ${email} has been linked to your account.`, messageId);
      return;
    }

    // ── Fallback ───────────────────────────────────────────────────────────
    default: {
      await saveSession(phone, "MENU");
      await sendListMenu(phone);
      return;
    }
  }
}

// ---------- HTTP entrypoint ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: any = null;
  try {
    const raw = await req.text();
    if (raw) {
      try { payload = JSON.parse(raw); } catch { payload = raw; }
    }
  } catch (e) {
    console.error("[MovaChatbot] failed to read body:", e);
  }

  console.log("[MovaChatbot] received webhook:", JSON.stringify(payload));

  const bg = handleConversation(payload).catch((err) => {
    console.error("[MovaChatbot] background handler error:", err);
  });

  // @ts-ignore
  if (typeof (globalThis as any).EdgeRuntime?.waitUntil === "function") {
    (globalThis as any).EdgeRuntime.waitUntil(bg);
  } else {
    await bg;
  }

  return new Response(
    JSON.stringify({ success: true, received: true, timestamp: new Date().toISOString() }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
