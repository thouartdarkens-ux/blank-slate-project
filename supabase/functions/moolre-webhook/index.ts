const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function buyVoucher(payload: {
  reference: string;
  phone_number: string;
  product: string;
  quantity: number;
  amount: number;
  metadata?: Record<string, unknown>;
}): Promise<any> {
  console.log("[moolre-webhook] calling buy-voucher-api-mnotify:", payload);
  const res = await fetch(
    "https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/buy-voucher-api-mnotify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "XBJtnhGpuZ9FzJVzNY2V3AvH03ohjOYi",
      },
      body: JSON.stringify(payload),
    },
  );
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  console.log("[moolre-webhook] buy-voucher-api-mnotify response:", res.status, JSON.stringify(json));
  return { ok: res.ok, status: res.status, data: json };
}

async function processCallback(body: any): Promise<void> {
  const code = body?.code;
  const status = body?.status;
  const data = body?.data ?? {};
  const txstatus = data?.txstatus;
  const metadata = data?.metadata ?? body?.metadata ?? {};
  const externalref =
    data?.externalref ?? data?.externalRef ?? body?.externalref ?? body?.externalRef;
  const transactionid = data?.transactionid;
  const thirdpartyref = data?.thirdpartyref;
  const payer = data?.payer;
  const amount_from_data = data?.amount;
  const ts = data?.ts;

  console.log("[moolre-webhook] === WEBHOOK PROCESSING START ===");
  console.log("[moolre-webhook] raw body:", JSON.stringify(body));
  console.log("[moolre-webhook] code=", code, "status=", status, "txstatus=", txstatus);
  console.log("[moolre-webhook] externalref=", externalref, "transactionid=", transactionid, "thirdpartyref=", thirdpartyref);
  console.log("[moolre-webhook] payer=", payer, "amount=", amount_from_data, "ts=", ts);
  console.log("[moolre-webhook] metadata=", JSON.stringify(metadata));

  // Success: status=1 AND code=PV05 (Transaction Successful) OR txstatus=1
  const isSuccess = (status === 1 && code === "PV05") || txstatus === 1;

  if (!isSuccess) {
    console.log("[moolre-webhook] non-success transaction, ignoring. code=", code, "status=", status, "txstatus=", txstatus);
    console.log("[moolre-webhook] === WEBHOOK PROCESSING END (non-success) ===");
    return;
  }

  console.log("[moolre-webhook] success transaction confirmed");

  if (!externalref) {
    console.error("[moolre-webhook] success but no externalref found");
    console.log("[moolre-webhook] === WEBHOOK PROCESSING END (no externalref) ===");
    return;
  }

  console.log("[moolre-webhook] extracting order details from metadata...");

  const product_type_raw = metadata?.product_type ?? metadata?.product ?? "";
  const product = String(product_type_raw).toUpperCase();
  const phone_number = String(metadata?.mobile_number ?? metadata?.phone_number ?? "");
  const quantity =
    typeof metadata?.quantity === "number"
      ? metadata.quantity
      : parseInt(String(metadata?.quantity ?? "1"), 10);
  const amount =
    typeof metadata?.amount === "number"
      ? metadata.amount
      : Number(metadata?.amount ?? amount_from_data ?? 0);

  console.log("[moolre-webhook] extracted order details:", { product, phone_number, quantity, amount });

  if (!phone_number || !product || !amount || isNaN(quantity)) {
    console.error("[moolre-webhook] missing required metadata:", { phone_number, product, amount, quantity });
    console.log("[moolre-webhook] === WEBHOOK PROCESSING END (missing metadata) ===");
    return;
  }

  if (product !== "WASSCE" && product !== "BECE") {
    console.log("[moolre-webhook] non-voucher product, ignoring:", product);
    console.log("[moolre-webhook] === WEBHOOK PROCESSING END (non-voucher) ===");
    return;
  }

  console.log("[moolre-webhook] proceeding to buy voucher:", { product, phone_number, quantity, amount, externalref });

  try {
    const result = await buyVoucher({
      reference: externalref,
      phone_number,
      product,
      quantity,
      amount,
      metadata,
    });
    console.log("[moolre-webhook] buyVoucher completed:", JSON.stringify(result));
  } catch (err) {
    console.error("[moolre-webhook] buyVoucher error:", err);
  }

  console.log("[moolre-webhook] === WEBHOOK PROCESSING END ===");
}

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
    console.error("[moolre-webhook] failed to read body:", e);
  }

  console.log("[moolre-webhook] received:", req.method, JSON.stringify(payload));

  const bg = processCallback(payload).catch((err) => {
    console.error("[moolre-webhook] background handler error:", err);
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