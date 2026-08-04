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

const sendSms = async (recipients: string[], message: string) => {
  try {
    const arkeselApiKey = "d21HelpLTHdvaWlwVGNLV2NTRFE";
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "api-key": arkeselApiKey,
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
    console.log("[nalowebhook] SMS response:", data);
  } catch (err) {
    console.error("[nalowebhook] SMS send failed:", err);
  }
};

const recordAndNotify = async (body: any) => {
  const SOURCE_HOOK = (body?.extra_data?.agent_code || "003").toUpperCase();
  const product = (body?.extra_data?.product || "").toString().toUpperCase();
  const phone = body?.extra_data?.phone_number || null;
  const quantity = Number(body?.extra_data?.quantity) || null;
  const amount = Number(body?.extra_data?.amount) || null;
  const status = body?.status || null;
  const reference = body?.reference || null;
  const fullName = body?.extra_data?.full_name || null;
  console.log("Commenced recording of",reference,"for",fullName )
  // Dedup: if we've already recorded this reference+status, skip insert & SMS
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
      if (exErr) console.error("[nalowebhook] dedup check error:", exErr);
      alreadyRecorded = !!existing;
    } catch (e) {
      console.error("[nalowebhook] dedup check exception:", e);
    }
  }

  if (alreadyRecorded) {
    console.log(`[nalowebhook] duplicate callback ref=${reference} status=${status}, skipping insert/SMS`);
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
    if (error) console.error("[nalowebhook] insert error:", error);
  } catch (e) {
    console.error("[nalowebhook] insert exception:", e);
  }

  // Calculate and assign commission to the affiliate associated with source_hook
  if (status === "COMPLETED" && (product === "BECE" || product === "WASSCE")) {
    try {
      const { data: affiliate, error: affErr } = await supabaseAdmin
        .from("affiliates")
        .select("id, balance, lifetime_commissions, sales_quantity, sales_amount, commission_rate")
        .eq("source_hook", SOURCE_HOOK)
        .maybeSingle();

      if (affErr) console.error("[nalowebhook] affiliate lookup error:", affErr);
      if (affiliate) {
        const commissionRate = Number(affiliate.commission_rate) || 0;
        const commission = +(amount * commissionRate / 100).toFixed(2);
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

        if (updErr) console.error("[nalowebhook] affiliate update error:", updErr);
        else console.log(`[nalowebhook] affiliate ${affiliate.id} updated: balance=${newBalance} lifetime=${newLifetime} salesQty=${newSalesQty} salesAmount=${newSalesAmount}`);
      }
    } catch (e) {
      console.error("[nalowebhook] balance calculation exception:", e);
    }
    // Master accumulator: roll the sale into the 'Comission' record for source_hook 001
    try {
      const MASTER_HOOK = "001";
      const { data: master, error: masterErr } = await supabaseAdmin
        .from("webhook_transactions")
        .select("id, amount, quantity")
        .eq("reference", "Comission")
        .eq("source_hook", MASTER_HOOK)
        .maybeSingle();

      if (masterErr) console.error("[nalowebhook] master lookup error:", masterErr);

      if (master) {
        const newAmount = +(Number(master.amount || 0) + Number(amount || 0)).toFixed(2);
        const newQty = Number(master.quantity || 0) + Number(quantity || 0);
        const { error: mUpdErr } = await supabaseAdmin
          .from("webhook_transactions")
          .update({ amount: newAmount, quantity: newQty })
          .eq("id", master.id);
        if (mUpdErr) console.error("[nalowebhook] master update error:", mUpdErr);
        else console.log(`[nalowebhook] master record updated: amount=${newAmount} quantity=${newQty}`);
      } else {
        console.log("[nalowebhook] master 'Comission' record not found for source_hook 001");
      }

      const { data: masterAff, error: mAffErr } = await supabaseAdmin
        .from("affiliates")
        .select("id, balance, lifetime_commissions, sales_quantity, sales_amount, commission_rate")
        .eq("source_hook", MASTER_HOOK)
        .maybeSingle();

      if (mAffErr) console.error("[nalowebhook] master affiliate lookup error:", mAffErr);

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

        if (mAffUpdErr) console.error("[nalowebhook] master affiliate update error:", mAffUpdErr);
        else console.log(`[nalowebhook] master affiliate ${masterAff.id} updated: balance=${balance} lifetime=${lifetime} salesQty=${salesQty} salesAmount=${salesAmount}`);
      } else {
        console.log("[nalowebhook] master affiliate with source_hook 001 not found");
      }
    } catch (e) {
      console.error("[nalowebhook] master accumulation exception:", e);
    }
  }

};

const purchase =async (body:any)=>{
  console.log("Verifyin completion")
  const product = (body?.extra_data?.product || "").toString().toUpperCase();
  if (product !== "BECE" && product !== "WASSCE") {
    console.log(`Non-voucher product=${product}, sending SMS notification`);
    if (body?.status === "COMPLETED") {
      try {
        const arkeselApiKey = "d21HelpLTHdvaWlwVGNLV2NTRFE";
        const senderId = "MOVAalerts";
        const recipients = ["0557956020"];
        const fullName = body?.extra_data?.full_name || "N/A";
        const message = `New ${product} order. Name: ${fullName}. Ref: ${body?.reference}. Phone: ${body?.extra_data?.phone_number}. Amount: GHS ${body?.extra_data?.amount}. Qty: ${body?.extra_data?.quantity}.`;
        const smsRes = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
          method: "POST",
          headers: {
            "api-key": arkeselApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender: senderId,
            message,
            recipients,
            sandbox: false,
          }),
        });
        const smsData = await smsRes.json();
        console.log("[nalowebhook] SMS response:", smsData);
      } catch (err) {
        console.error("[nalowebhook] SMS send failed:", err);
      }
    }
    return;
  }
  if(body?.status ==="COMPLETED"){
console.log("transuction completed callin voucher endpoint")

const qty = Number(body?.extra_data?.quantity) || 0;
const rawAmount = Number(body?.extra_data?.amount) || 0;

const payload = {
  
    reference: body?.reference,
    phone_number:body?.extra_data?.phone_number,
    product:body?.extra_data?.product.toUpperCase(),
    quantity: qty,
    amount: rawAmount,
    email: ``,
    
  };

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
  console.log(data);}else if (body?.status==="FAILED")
  {
    try {
        const arkeselApiKey = "d21HelpLTHdvaWlwVGNLV2NTRFE";
        const senderId = "movaalerts";
        const recipients = [body?.extra_data?.phone_number];
        const fullName = body?.extra_data?.full_name || "N/A";
        const message = `Checker purchase failed. Ensure MoMo wallet is funded and try again.`;
        const smsRes = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
          method: "POST",
          headers: {
            "api-key": arkeselApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender: senderId,
            message,
            recipients,
            sandbox: false,
          }),
        });
        const smsData = await smsRes.json();
        console.log("[nalowebhook] SMS response:", smsData);
      } catch (err) {
        console.error("[nalowebhook] SMS send failed:", err);
      }
  }

}

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
    console.error("[nalowebhook] failed to read body:", e);
  }

  console.log("[nalowebhook] received callback", {
    method: req.method,
    path: url.pathname,
    query: queryParams,
    headers,
  
  });
  console.log(body)

  // Ensure background work completes even after the response is sent
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
