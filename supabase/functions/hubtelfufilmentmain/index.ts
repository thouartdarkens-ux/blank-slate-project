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

const ARKESEL_API_KEY = "d21HelpLTHdvaWlwVGNLV2NTRFE";
const SOURCE_HOOK = "HUBTELMAIN";

const sendSms = async (recipients: string[], message: string) => {
  try {
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: { "api-key": ARKESEL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ sender: "MOVAalerts", message, recipients, sandbox: false }),
    });
    console.log("[hubtelfufilmentmain] SMS response:", await res.json());
  } catch (err) {
    console.error("[hubtelfufilmentmain] SMS send failed:", err);
  }
};

type Ctx = {
  sessionId: string;
  orderId: string;
  reference: string;
  phone: string | null;
  fullName: string | null;
  product: string;
  quantity: number;
  amount: number;
  status: string;
};

const buildContext = async (body: any): Promise<Ctx> => {
  const sessionId = body?.SessionId || "";
  const orderId = body?.OrderId || "";
  const info = body?.OrderInfo || {};
  const items = Array.isArray(info?.Items) ? info.Items : [];

  // Session data saved by hubtelussdmain at AddToCart time
  let sessionData: Record<string, any> = {};
  if (sessionId) {
    const { data, error } = await supabaseAdmin
      .from("nalo_ussd_sessions")
      .select("session_data")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (error) console.error("[hubtelfufilmentmain] session lookup error:", error);
    sessionData = (data?.session_data ?? {}) as Record<string, any>;
  }

  const itemName = (items[0]?.Name || "").toString().toUpperCase();
  const product = (sessionData.product ||
    (itemName.includes("WASSCE") ? "WASSCE" : itemName.includes("BECE") ? "BECE" : itemName))
    .toString().toUpperCase();

  const quantity = Number(sessionData.qty ?? items[0]?.Quantity ?? 0) || 0;
  const amount = Number(info?.Payment?.AmountPaid ?? info?.Subtotal ?? 0) || 0;
  const paid = info?.Payment?.IsSuccessful === true ||
    (info?.Status || "").toString().toUpperCase() === "PAID";

  return {
    sessionId,
    orderId,
    reference: sessionData.reference || orderId,
    phone: info?.CustomerMobileNumber || sessionData.msisdn || null,
    fullName: sessionData.fullName || info?.CustomerName || null,
    product,
    quantity,
    amount,
    status: paid ? "COMPLETED" : "FAILED",
  };
};

const recordAndNotify = async (ctx: Ctx, body: any) => {
  const { reference, status, product, quantity, amount, phone, fullName } = ctx;
  console.log("[hubtelfufilmentmain] Commenced recording of", reference, "for", fullName);

  let alreadyRecorded = false;
  if (reference && status) {
    try {
      const { data: existing, error: exErr } = await supabaseAdmin
        .from("nalowebhook_transactions")
        .select("id")
        .eq("reference", reference)
        .eq("status", status)
        .limit(1)
        .maybeSingle();
      if (exErr) console.error("[hubtelfufilmentmain] dedup check error:", exErr);
      alreadyRecorded = !!existing;
    } catch (e) {
      console.error("[hubtelfufilmentmain] dedup check exception:", e);
    }
  }

  if (alreadyRecorded) {
    console.log(`[hubtelfufilmentmain] duplicate callback ref=${reference} status=${status}, skipping insert/SMS`);
    return;
  }

  try {
    const { error } = await supabaseAdmin.from("nalowebhook_transactions").insert({
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
    if (error) console.error("[hubtelfufilmentmain] insert error:", error);
  } catch (e) {
    console.error("[hubtelfufilmentmain] insert exception:", e);
  }

  if (status === "COMPLETED" && (product === "BECE" || product === "WASSCE")) {
    try {
      console.log("[hubtelfufilmentmain] calculating daily profit");
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data, error } = await supabaseAdmin
        .from("nalowebhook_transactions")
        .select("amount")
        .eq("status", "COMPLETED")
        .eq("product", product)
        .gte("created_at", startOfDay.toISOString());
      if (error) console.error("[hubtelfufilmentmain] daily total error:", error);
      const dailyTotal = (data || []).reduce(
        (sum: number, r: any) => sum + (Number(r.amount) || 0),
        0,
      );
      const msg = `Dear MOVA Consult, You have received GHS${amount} from ${phone} for ${quantity}${product} voucher. Your current daily balance is GHS ${dailyTotal.toFixed(2)}`;
      await sendSms(["0557956020"], msg);
      console.log("[hubtelfufilmentmain] trans Alert sent", msg);
    } catch (e) {
      console.error("[hubtelfufilmentmain] daily total exception:", e);
    }
  }
};

const purchase = async (ctx: Ctx): Promise<boolean> => {
  const { product, status, quantity, amount, reference, phone, fullName } = ctx;
  console.log("[hubtelfufilmentmain] Verifying completion");

  if (product !== "BECE" && product !== "WASSCE") {
    console.log(`[hubtelfufilmentmain] Non-voucher product=${product}, sending SMS notification`);
    if (status === "COMPLETED") {
      const message = `New ${product} order. Name: ${fullName || "N/A"}. Ref: ${reference}. Phone: ${phone}. Amount: GHS ${amount}. Qty: ${quantity}.`;
      await sendSms(["0557956020"], message);
      return true;
    }
    return false;
  }

  if (status === "COMPLETED") {
    console.log("[hubtelfufilmentmain] transaction completed, calling voucher endpoint");
    const voucherAmount = +(amount - 0.5 * quantity).toFixed(2);
    const payload = {
      reference,
      phone_number: phone,
      product,
      quantity,
      amount: voucherAmount,
      email: ``,
    };
    try {
      const response = await fetch(
        `https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/buy-voucher-api-nalo`,
        {
          method: "POST",
          headers: {
            "x-api-key": "XBJtnhGpuZ9FzJVzNY2V3AvH03ohjOYi",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      console.log("[hubtelfufilmentmain] voucher api response:", await response.json());
      return response.ok;
    } catch (e) {
      console.error("[hubtelfufilmentmain] voucher api exception:", e);
      return false;
    }
  }

  if (status === "FAILED" && phone) {
    await sendSms([phone], "Checker purchase failed. Ensure MoMo wallet is funded and try again.");
  }
  return false;
};

const confirmToHubtel = async (ctx: Ctx, success: boolean) => {
  try {
    const res = await fetch("https://gs-callback.hubtel.com:9055/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        SessionId: ctx.sessionId,
        OrderId: ctx.orderId,
        ServiceStatus: success ? "success" : "failed",
        MetaData: null,
      }),
    });
    console.log("[hubtelfufilmentmain] hubtel callback status:", res.status, await res.text());
  } catch (e) {
    console.error("[hubtelfufilmentmain] hubtel callback exception:", e);
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any = null;
  try {
    const rawBody = await req.text();
    if (rawBody) {
      try { body = JSON.parse(rawBody); } catch { body = rawBody; }
    }
  } catch (e) {
    console.error("[hubtelfufilmentmain] failed to read body:", e);
  }

  console.log("[hubtelfufilmentmain] received fulfillment", JSON.stringify(body));

  // @ts-ignore EdgeRuntime is provided by Supabase Edge Runtime
  const waitUntil = (globalThis as any).EdgeRuntime?.waitUntil;
  const bg = (async () => {
    try {
      const ctx = await buildContext(body);
      console.log("[hubtelfufilmentmain] context:", ctx);
      await recordAndNotify(ctx, body);
      const ok = await purchase(ctx);
      await confirmToHubtel(ctx, ok || ctx.status === "COMPLETED");
      if (ctx.sessionId) {
        await supabaseAdmin.from("nalo_ussd_sessions").delete().eq("session_id", ctx.sessionId);
      }
    } catch (e) {
      console.error("[hubtelfufilmentmain] processing exception:", e);
    }
  })();
  if (typeof waitUntil === "function") waitUntil(bg); else await bg;

  return new Response(JSON.stringify({ success: true, received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
