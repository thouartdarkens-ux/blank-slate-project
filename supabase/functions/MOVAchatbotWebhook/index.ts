import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHATBOT_API_KEY = "d863d448-ddf3-49cc-abd3-b959a6ded853";
const SEND_URL = "https://api.chatbotsafrica.com/api/v1.0/send/message";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---------- WhatsApp outbound message ----------

async function sendWhatsApp(destination: string, message: string): Promise<void> {
  const body = {
    apikey: CHATBOT_API_KEY,
    destination,
    message,
  };
  console.log("[MOVAchatbotWebhook] sending WhatsApp to:", destination, "msg:", message.slice(0, 80));
  const res = await fetch(SEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log("[MOVAchatbotWebhook] WhatsApp response:", res.status, await res.text());
}

// ---------- Buy voucher via buy-voucher-api-mnotify ----------

async function buyVoucher(payload: {
  reference: string;
  phone_number: string;
  product: string;
  quantity: number;
  amount: number;
}): Promise<any> {
  console.log("[MOVAchatbotWebhook] calling buy-voucher-api-mnotify:", payload);
  const response = await fetch(
    `https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/buy-voucher-api-mnotify`,
    {
      method: "POST",
      headers: {
        "x-api-key": "XBJtnhGpuZ9FzJVzNY2V3AvH03ohjOYi",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  const data = await response.json();
  console.log("[MOVAchatbotWebhook] buy-voucher-api-mnotify response:", JSON.stringify(data));
  return data;
}

// ---------- Main handler ----------

async function processCallback(body: any): Promise<void> {
  const code = body?.code;
  const data = body?.data ?? {};
  const externalref = data?.externalref ?? body?.externalref;

  console.log("[MOVAchatbotWebhook] processing code=", code, "externalref=", externalref);

  // Only handle successful transactions
  if (code !== "P01") {
    console.log("[MOVAchatbotWebhook] code is not P01, ignoring. code=", code);

    // If we have an externalref, mark the transaction as FAILED
    if (externalref) {
      try {
        await supabaseAdmin
          .from("BOTtransactions")
          .update({ status: "FAILED" })
          .eq("external_ref", externalref);
      } catch (e) {
        console.error("[MOVAchatbotWebhook] failed to mark FAILED:", e);
      }
    }
    return;
  }

  if (!externalref) {
    console.error("[MOVAchatbotWebhook] P01 but no externalref, cannot process");
    return;
  }

  // Look up the transaction in BOTtransactions
  const { data: txn, error: txnErr } = await supabaseAdmin
    .from("BOTtransactions")
    .select("external_ref, product, quantity, phone_number, amount, status")
    .eq("external_ref", externalref)
    .maybeSingle();

  if (txnErr) {
    console.error("[MOVAchatbotWebhook] BOTtransactions lookup error:", txnErr);
    return;
  }
  if (!txn) {
    console.error("[MOVAchatbotWebhook] no BOTtransactions row for externalref=", externalref);
    return;
  }
  if (txn.status === "COMPLETED") {
    console.log("[MOVAchatbotWebhook] already completed, skipping:", externalref);
    return;
  }

  const { product, quantity, phone_number, amount } = txn;

  // Mark as COMPLETED
  try {
    await supabaseAdmin
      .from("BOTtransactions")
      .update({ status: "COMPLETED" })
      .eq("external_ref", externalref);
  } catch (e) {
    console.error("[MOVAchatbotWebhook] failed to mark COMPLETED:", e);
  }

  // Buy the voucher
  let voucherResult: any;
  try {
    voucherResult = await buyVoucher({
      reference: externalref,
      phone_number,
      product,
      quantity,
      amount: Number(amount),
    });
  } catch (err) {
    console.error("[MOVAchatbotWebhook] buyVoucher error:", err);
    await sendWhatsApp(
      phone_number,
      "Payment received but we could not deliver your voucher automatically. Please contact support: 0557956020 with reference " + externalref,
    );
    return;
  }

  // Extract voucher(s) from the response
  // Expected shape: { success: true, voucher: [{ serial, pin, type, phone_number, reference }], transaction_id }
  const voucher = voucherResult?.voucher;
  const voucherList = Array.isArray(voucher) ? voucher : (voucher ? [voucher] : []);

  if (voucherList.length === 0) {
    console.error("[MOVAchatbotWebhook] no voucher in response:", JSON.stringify(voucherResult));
    await sendWhatsApp(
      phone_number,
      "Payment received but voucher delivery failed. Please contact support: 0557956020 with reference " + externalref,
    );
    return;
  }

  for (const v of voucherList) {
    const serial = v?.serial ?? "N/A";
    const pin = v?.pin ?? "N/A";
    const type = v?.type ?? product;
    const message =
      `MOVA CONSULT - ${type} Result Checker\n` +
      `SERIAL: ${serial}\n` +
      `PIN: ${pin}\n` +
      `REFERENCE: ${externalref}\n` +
      `Thank you for using MOVA CONSULT.\n` + 
      `LINK:${type.toUpperCase()==="BECE"?"eresults.waecgh.org":"ghana.waecdirect.org"}`;
    try {
      await sendWhatsApp(phone_number, message);
    } catch (err) {
      console.error("[MOVAchatbotWebhook] WhatsApp send error:", err);
    }
  }
}

// ---------- HTTP entrypoint ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  let payload: unknown = null;
  try {
    const raw = await req.text();
    if (raw) {
      try { payload = JSON.parse(raw); } catch { payload = raw; }
    }
  } catch (e) {
    console.error("[MOVAchatbotWebhook] failed to read body:", e);
  }

  console.log("[MOVAchatbotWebhook] received:", req.method, JSON.stringify(payload));

  const bg = processCallback(payload).catch((err) => {
    console.error("[MOVAchatbotWebhook] background handler error:", err);
  });

  // @ts-ignore EdgeRuntime is provided by Supabase Edge Runtime
  const waitUntil = (globalThis as any).EdgeRuntime?.waitUntil;
  if (typeof waitUntil === "function") waitUntil(bg);
  else await bg;

  return new Response(
    JSON.stringify({ success: true, received: true, timestamp: new Date().toISOString() }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
