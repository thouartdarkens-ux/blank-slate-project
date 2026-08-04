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

const sendSms = async (recipients: string[], message: string) => {
  try {
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: { "api-key": ARKESEL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ sender: "MOVAalerts", message, recipients, sandbox: false }),
    });
    console.log("[hubtelfufilment] SMS response:", await res.json());
  } catch (err) {
    console.error("[hubtelfufilment] SMS send failed:", err);
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
  sourceHook: string;
};

const buildContext = async (body: any): Promise<Ctx> => {
  const sessionId = body?.SessionId || "";
  const orderId = body?.OrderId || "";
  const info = body?.OrderInfo || {};
  const items = Array.isArray(info?.Items) ? info.Items : [];

  // Session data saved by hubtelussd at AddToCart time
  let sessionData: Record<string, any> = {};
  if (sessionId) {
    const { data, error } = await supabaseAdmin
      .from("nalo_ussd_sessions")
      .select("session_data")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (error) console.error("[hubtelfufilment] session lookup error:", error);
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
    fullName: info?.CustomerName || null,
    product,
    quantity,
    amount,
    status: paid ? "COMPLETED" : "FAILED",
    sourceHook: (sessionData.agentCode || "001").toString().toUpperCase(),
  };
};

const recordAndNotify = async (ctx: Ctx, body: any) => {
  const { reference, status, sourceHook: SOURCE_HOOK, product, quantity, amount, phone, fullName } = ctx;
  console.log("[hubtelfufilment] Commenced recording of", reference, "for", fullName);

  let alreadyRecorded = false;
  if (reference && status) {
    try {
      const { data: existing, error: exErr } = await supabaseAdmin
        .from("webhook_transactions")
        .select("id")
        .eq("reference", reference)
        .eq("status", status)
        .eq("source_hook", SOURCE_HOOK)
        .limit(1)
        .maybeSingle();
      if (exErr) console.error("[hubtelfufilment] dedup check error:", exErr);
      alreadyRecorded = !!existing;
    } catch (e) {
      console.error("[hubtelfufilment] dedup check exception:", e);
    }
  }

  if (alreadyRecorded) {
    console.log(`[hubtelfufilment] duplicate callback ref=${reference} status=${status}, skipping insert`);
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
    if (error) console.error("[hubtelfufilment] insert error:", error);
  } catch (e) {
    console.error("[hubtelfufilment] insert exception:", e);
  }

  if (status === "COMPLETED" && (product === "BECE" || product === "WASSCE")) {
    // Affiliate commission for this source hook
    try {
      const { data: affiliate, error: affErr } = await supabaseAdmin
        .from("affiliates")
        .select("id, balance, lifetime_commissions, sales_quantity, sales_amount, commission_rate")
        .eq("source_hook", SOURCE_HOOK)
        .maybeSingle();
      if (affErr) console.error("[hubtelfufilment] affiliate lookup error:", affErr);
      if (affiliate) {
        const rate = Number(affiliate.commission_rate) || 0;
        const commission = +(amount * rate / 100).toFixed(2);
        const newBalance = +(Number(affiliate.balance) + commission).toFixed(2);
        const newLifetime = +(Number(affiliate.lifetime_commissions) + commission).toFixed(2);
        const newSalesQty = Number(affiliate.sales_quantity) + Number(quantity);
        const newSalesAmount = +(Number(affiliate.sales_amount) + Number(amount)).toFixed(2);
        const { error: updErr } = await supabaseAdmin
          .from("affiliates")
          .update({
            balance: newBalance,
            lifetime_commissions: newLifetime,
            sales_quantity: newSalesQty,
            sales_amount: newSalesAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", affiliate.id);
        if (updErr) console.error("[hubtelfufilment] affiliate update error:", updErr);
        else console.log(`[hubtelfufilment] affiliate ${affiliate.id} updated: balance=${newBalance} lifetime=${newLifetime}`);
      }
    } catch (e) {
      console.error("[hubtelfufilment] balance calculation exception:", e);
    }

    // Master accumulator on source_hook 001
    try {
      const MASTER_HOOK = "001";
      const { data: master, error: masterErr } = await supabaseAdmin
        .from("webhook_transactions")
        .select("id, amount, quantity")
        .eq("reference", "Comission")
        .eq("source_hook", MASTER_HOOK)
        .maybeSingle();
      if (masterErr) console.error("[hubtelfufilment] master lookup error:", masterErr);
      if (master) {
        const newAmount = +(Number(master.amount || 0) + Number(amount || 0)).toFixed(2);
        const newQty = Number(master.quantity || 0) + Number(quantity || 0);
        const { error: mUpdErr } = await supabaseAdmin
          .from("webhook_transactions")
          .update({ amount: newAmount, quantity: newQty })
          .eq("id", master.id);
        if (mUpdErr) console.error("[hubtelfufilment] master update error:", mUpdErr);
        else console.log(`[hubtelfufilment] master record updated: amount=${newAmount} quantity=${newQty}`);
      } else {
        console.log("[hubtelfufilment] master 'Comission' record not found for source_hook 001");
      }

      const { data: masterAff, error: mAffErr } = await supabaseAdmin
        .from("affiliates")
        .select("id, balance, lifetime_commissions, sales_quantity, sales_amount, commission_rate")
        .eq("source_hook", MASTER_HOOK)
        .maybeSingle();
      if (mAffErr) console.error("[hubtelfufilment] master affiliate lookup error:", mAffErr);
      if (masterAff) {
        const rate = Number(masterAff.commission_rate) || 0;
        const commission = +(Number(amount || 0) * rate / 100).toFixed(2);
        const balance = +(Number(masterAff.balance) + commission).toFixed(2);
        const lifetime = +(Number(masterAff.lifetime_commissions) + commission).toFixed(2);
        const salesQty = Number(masterAff.sales_quantity) + Number(quantity || 0);
        const salesAmount = +(Number(masterAff.sales_amount) + Number(amount || 0)).toFixed(2);
        const { error: mAffUpdErr } = await supabaseAdmin
          .from("affiliates")
          .update({
            balance,
            lifetime_commissions: lifetime,
            sales_quantity: salesQty,
            sales_amount: salesAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", masterAff.id);
        if (mAffUpdErr) console.error("[hubtelfufilment] master affiliate update error:", mAffUpdErr);
        else console.log(`[hubtelfufilment] master affiliate ${masterAff.id} updated: balance=${balance}`);
      } else {
        console.log("[hubtelfufilment] master affiliate with source_hook 001 not found");
      }
    } catch (e) {
      console.error("[hubtelfufilment] master accumulation exception:", e);
    }
  }
};

const purchase = async (ctx: Ctx) => {
  const { product, status, quantity, amount, reference, phone } = ctx;
  console.log("[hubtelfufilment] Verifying completion");

  if (product !== "BECE" && product !== "WASSCE") {
    if (status === "COMPLETED") {
      const message = `New ${product} order. Name: ${ctx.fullName || "N/A"}. Ref: ${reference}. Phone: ${phone}. Amount: GHS ${amount}. Qty: ${quantity}.`;
      await sendSms(["0557956020"], message);
    }
    return false;
  }

  if (status === "COMPLETED") {
    console.log("[hubtelfufilment] transaction completed, calling voucher endpoint");
    const voucherAmount = +(amount - 5 * quantity).toFixed(2);
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
      const data = await response.json();
      console.log("[hubtelfufilment] voucher api response:", data);
      return response.ok;
    } catch (e) {
      console.error("[hubtelfufilment] voucher api exception:", e);
      return false;
    }
  }

  if (status === "FAILED" && phone) {
    await sendSms([phone], "Checker purchase failed. Ensure MoMo wallet is funded and try again");
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
    console.log("[hubtelfufilment] hubtel callback status:", res.status, await res.text());
  } catch (e) {
    console.error("[hubtelfufilment] hubtel callback exception:", e);
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
    console.error("[hubtelfufilment] failed to read body:", e);
  }

  console.log("[hubtelfufilment] received fulfillment", JSON.stringify(body));

  // @ts-ignore EdgeRuntime is provided by Supabase Edge Runtime
  const waitUntil = (globalThis as any).EdgeRuntime?.waitUntil;
  const bg = (async () => {
    try {
      const ctx = await buildContext(body);
      console.log("[hubtelfufilment] context:", ctx);
      await recordAndNotify(ctx, body);
      const ok = await purchase(ctx);
      await confirmToHubtel(ctx, ok || ctx.status === "COMPLETED");
      if (ctx.sessionId) {
        await supabaseAdmin.from("nalo_ussd_sessions").delete().eq("session_id", ctx.sessionId);
      }
    } catch (e) {
      console.error("[hubtelfufilment] processing exception:", e);
    }
  })();
  if (typeof waitUntil === "function") waitUntil(bg); else await bg;

  return new Response(JSON.stringify({ success: true, received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
