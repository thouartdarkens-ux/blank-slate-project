import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// {{SOURCE_HOOK}} — substituted at clone time with this function's slug
const SOURCE_HOOK = "{{SOURCE_HOOK}}";
// {{NOTIFICATION_PHONE}} — substituted at clone time with the affiliate's phone
const NOTIFICATION_PHONE = "{{NOTIFICATION_PHONE}}";
const ARKESEL_API_KEY = "d21HelpLTHdvaWlwVGNLV2NTRFE";

const sendSms = async (recipients: string[], message: string) => {
  try {
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "api-key": ARKESEL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: "MOVAalerts",
        message,
        recipients,
        sandbox: false,
      }),
    });
    const data = await res.json();
    console.log("[webhook] SMS response:", data);
  } catch (err) {
    console.error("[webhook] SMS send failed:", err);
  }
};

const recordAndNotify = async (body: any) => {
  const product = (body?.extra_data?.product || "").toString().toUpperCase();
  const phone = body?.extra_data?.phone_number || null;
  const quantity = Number(body?.extra_data?.quantity) || null;
  const amount = Number(body?.extra_data?.amount) || null;
  const status = body?.status || null;
  const reference = body?.reference || null;
  const fullName = body?.extra_data?.full_name || null;
  console.log("Commenced recording of", reference, "for", fullName);

  let alreadyRecorded = false;
  if (reference && status) {
    try {
      const { data: existing } = await supabaseAdmin
        .from("webhook_transactions")
        .select("id")
        .eq("reference", reference)
        .eq("status", status)
        .eq("source_hook", SOURCE_HOOK)
        .limit(1)
        .maybeSingle();
      alreadyRecorded = !!existing;
    } catch (e) {
      console.error("[webhook] dedup check exception:", e);
    }
  }

  if (alreadyRecorded) {
    console.log(`[webhook] duplicate callback ref=${reference} status=${status}, skipping insert/SMS`);
    return;
  }

  try {
    const { error } = await supabaseAdmin.from("webhook_transactions").insert({
      reference,
      phone_number: phone,
      product,
      quantity,
      amount,
      status,
      full_name: fullName,
      raw_payload: body,
      source_hook: SOURCE_HOOK,
    });
    if (error) console.error("[webhook] insert error:", error);
  } catch (e) {
    console.error("[webhook] insert exception:", e);
  }

  if (status === "COMPLETED" && (product === "BECE" || product === "WASSCE")) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data, error } = await supabaseAdmin
        .from("webhook_transactions")
        .select("amount")
        .eq("status", "COMPLETED")
        .eq("product", product)
        .eq("source_hook", SOURCE_HOOK)
        .gte("created_at", startOfDay.toISOString());
      if (error) console.error("[webhook] daily total error:", error);
      const dailyTotal = (data || []).reduce(
        (sum: number, r: any) => sum + (Number(r.amount) || 0),
        0,
      );
      const msg = `Dear MOVA Consult, You have received GHS${amount} from ${phone} for ${quantity}${product} voucher. Your current daily balance is GHS ${dailyTotal.toFixed(2)}`;
      await sendSms([NOTIFICATION_PHONE], msg);
      console.log("trans Alert sent", msg);
    } catch (e) {
      console.error("[webhook] daily total exception:", e);
    }
  }
};

const purchase = async (body: any) => {
  console.log("Verifying completion");
  const product = (body?.extra_data?.product || "").toString().toUpperCase();
  if (product !== "BECE" && product !== "WASSCE") {
    console.log(`Non-voucher product=${product}, sending SMS notification`);
    if (body?.status === "COMPLETED") {
      try {
        const fullName = body?.extra_data?.full_name || "N/A";
        const message = `New ${product} order. Name: ${fullName}. Ref: ${body?.reference}. Phone: ${body?.extra_data?.phone_number}. Amount: GHS ${body?.extra_data?.amount}. Qty: ${body?.extra_data?.quantity}.`;
        await sendSms([NOTIFICATION_PHONE], message);
      } catch (err) {
        console.error("[webhook] SMS send failed:", err);
      }
    }
    return;
  }
  if (body?.status === "COMPLETED") {
    console.log("transaction completed calling voucher endpoint");
    const qty = Number(body?.extra_data?.quantity) || 0;
    const rawAmount = Number(body?.extra_data?.amount) || 0;
    const voucherAmount = +(rawAmount - 0.5 * qty).toFixed(2);

    const payload = {
      reference: body?.reference,
      phone_number: body?.extra_data?.phone_number,
      product: body?.extra_data?.product.toUpperCase(),
      quantity: qty,
      amount: voucherAmount,
      email: ``,
    };

    const response = await fetch(
      `https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/buy-voucher-api`,
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
    console.log(data);
  } else if (body?.status === "FAILED") {
    try {
      const recipients = [body?.extra_data?.phone_number];
      const message = `Checker purchase failed. Ensure MoMo wallet is funded. Dial *920*138# to retry again.`;
      await sendSms(recipients, message);
    } catch (err) {
      console.error("[webhook] SMS send failed:", err);
    }
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const headers = Object.fromEntries(req.headers.entries());
  const queryParams = Object.fromEntries(url.searchParams.entries());

  let body: unknown = null;
  let rawBody = "";
  try {
    rawBody = await req.text();
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = rawBody;
      }
    }
  } catch (e) {
    console.error("[webhook] failed to read body:", e);
  }

  console.log("[webhook] received callback", {
    method: req.method,
    path: url.pathname,
    query: queryParams,
    headers,
  });
  console.log(body);

  // @ts-ignore EdgeRuntime is provided by Supabase Edge Runtime
  const waitUntil = (globalThis as any).EdgeRuntime?.waitUntil;
  const bg = (async () => {
    await recordAndNotify(body);
    await purchase(body);
  })();
  if (typeof waitUntil === "function") waitUntil(bg); else await bg;

  return new Response(
    JSON.stringify({ success: true, received: true }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
