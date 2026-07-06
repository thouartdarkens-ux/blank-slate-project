import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function nalo(userid: string, msisdn: string, msg: string, keepOpen: boolean) {
  return new Response(
    JSON.stringify({ USERID: userid, MSISDN: msisdn, MSG: msg, MSGTYPE: keepOpen }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

const MAIN_MENU_PAGE_1 =
  `Welcome to MOVA CONSULT\nMain Menu\n1. Buy BECE Checker\n2. Buy WASSCE/NOVDEC Checker\n3. Buy Tertiary Admission Forms\n4. Retrieve old Checker\n#. Next`;
const MAIN_MENU_PAGE_2 =
  `Main Menu\n5. Link email\n6. Contact support\n7. Updates\n0. Back`;
const MAIN_MENU = MAIN_MENU_PAGE_1;

const UPDATES_MSG =
  "Dial *789*444# for WASSCE news. Likely Release Date: 18 Nov2025 @ 11am . Current Step: Result Quality check. Whatsapp: 0557956020 Final Result only";

type FormItem = { code: string; label: string; price: number };
const FORMS: FormItem[] = [
  { code: "COE", label: "COE", price: 375.0 },
  { code: "KNUST_UNDERGRAD", label: "KNUST UNDERGRAD", price: 280.0 },
  { code: "LEGON_UNDERGRAD", label: "LEGON UNDERGRAD", price: 240.0 },
  { code: "UCC_UNDERGRAD", label: "UCC UNDERGRAD", price: 240.0 },
  { code: "UEW_UNDERGRAD", label: "UEW UNDERGRAD", price: 275.0 },
  { code: "UHAS_UNDERGRAD", label: "UHAS UNDERGRAD", price: 260.0 },
  { code: "UPSA_UNDERGRAD", label: "UPSA UNDERGRAD", price: 275.0 },
];

const FORMS_PAGE_1 =
  `Select form type\n1. COE - GHS 375.0\n2. KNUST UNDERGRAD - GHS 280.0\n3. LEGON UNDERGRAD - GHS 240.0\n4. UCC UNDERGRAD - GHS 240.0\nz. Next\n0. Back`;
const FORMS_PAGE_2 =
  `Select form type\n5. UEW UNDERGRAD - GHS 275.0\n6. UHAS UNDERGRAD - GHS 260.0\n7. UPSA UNDERGRAD - GHS 275.0\n0. Back\nb. Main Menu`;

const retreivevouch = async (reference: string) => {
  const response = await fetch(
    `https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/get-voucher-history?reference=${reference}`,
    {
      method: "POST",
      headers: {
        "x-api-key": "XBJtnhGpuZ9FzJVzNY2V3AvH03ohjOYi",
        "Content-Type": "application/json",
      },
    },
  );
  const data = await response.json();
  console.log(data);
};

const linkemail = async (Phone_number: string, email: string) => {
  const response = await fetch(
    `https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/phone-email-api`,
    {
      method: "POST",
      headers: {
        "x-api-key": "XBJtnhGpuZ9FzJVzNY2V3AvH03ohjOYi",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone_number: Phone_number, email }),
    },
  );
  const data = await response.json();
  console.log(data);
};

const retreive = async (phone_number: string) => {
  const response = await fetch(
    `https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/phone-email-api?phone_number=${phone_number}`,
    {
      method: "GET",
      headers: {
        "x-api-key": "XBJtnhGpuZ9FzJVzNY2V3AvH03ohjOYi",
        "Content-Type": "application/json",
      },
    },
  );
  const data = await response.json();
  console.log(data);
  return data;
};

async function hmacSha256Hex(key: string, message: string) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function initiateCollection({
  msisdn,
  accountName,
  amount,
  reference,
  network,
  product,
  qty,
  fullName,
}: {
  msisdn: string;
  accountName: string;
  amount: number;
  reference: string;
  network: string;
  product: string;
  qty: number;
  fullName?: string;
}) {
  const merchantId = Deno.env.get("COLLECTION_MERCHANT_ID")!;
  const secret = Deno.env.get("COLLECTION_MERCHANT_SECRET")!;
  const baseUrl = Deno.env.get("COLLECTION_BASE_URL")!;
  const callback = `${Deno.env.get("SUPABASE_URL")}/functions/v1/nalowebhook-user-1`;
  const basicToken = Deno.env.get("COLLECTION_BASIC_TOKEN")!;

  const baseUrlClean = baseUrl.replace(/\/+$/, "");

  // Step 1: generate payment token
  const tokenUrl = `${baseUrlClean}/clientapi/generate-payment-token/`;
  const tokenBody = { merchant_id: merchantId };
  console.log("[collection] token request:", { url: tokenUrl, body: tokenBody, authPrefix: `Basic ${basicToken.slice(0, 12)}...` });
  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${basicToken}`,
    },
    body: JSON.stringify(tokenBody),
  });
  const tokenText = await tokenRes.text();
  console.log("[collection] token response:", { status: tokenRes.status, body: tokenText });
  let tokenJson: any = {};
  try { tokenJson = JSON.parse(tokenText); } catch { /* keep empty */ }
  const paymentToken = tokenJson?.data?.token;
  if (!paymentToken) {
    throw new Error(`Failed to generate payment token: ${tokenText}`);
  }

  const amountStr = amount.toFixed(2);
  const message = `${merchantId}${msisdn}${amountStr}${reference}`;
  const trans_hash = await hmacSha256Hex(secret, message);

  const extra_data: Record<string, any> = { product, amount, quantity: qty, phone_number: msisdn };
  if (fullName) extra_data.full_name = fullName;

  const body = {
    merchant_id: merchantId,
    service_name: "MOMO_TRANSACTION",
    trans_hash,
    account_number: msisdn,
    account_name: accountName || "USSD Customer",
    description: `${product.toUpperCase()} x${qty}`,
    reference,
    callback,
    network,
    amount,
    extra_data,
  };


  const url = `${baseUrlClean}/clientapi/collection/`;
  console.log("[collection] collection request:", { url, body, tokenPrefix: paymentToken.slice(0, 24) + "..." });
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "token": paymentToken,
    },
    body: JSON.stringify(body),
  });
  const respText = await response.text();
  console.log("[collection] collection response:", { status: response.status, body: respText });
  let data: any = {};
  try { data = JSON.parse(respText); } catch { /* keep empty */ }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const reqId = crypto.randomUUID().slice(0, 8);

  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return nalo("", "", "Empty request body.", false);
    }
    const body = JSON.parse(rawBody);
    const USERID: string = body.USERID ?? "";
    const MSISDN: string = body.MSISDN ?? "";
    const USERDATA: string = (body.USERDATA ?? "").toString().trim();
    const MSGTYPE: boolean = body.MSGTYPE === true || body.MSGTYPE === "true";
    const NETWORK_RAW: string = (body.NETWORK ?? "").toString();
    const SESSIONID: string = body.SESSIONID ?? "";

    console.log(
      `[${reqId}] sid=${SESSIONID} first=${MSGTYPE} msisdn=${MSISDN} network=${NETWORK_RAW} userdata="${USERDATA}"`,
    );

    if (!SESSIONID) {
      return nalo(USERID, MSISDN, "Missing SESSIONID.", false);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    async function getSession() {
      const { data } = await supabase
        .from("nalo_ussd_sessions")
        .select("stage, session_data")
        .eq("session_id", SESSIONID)
        .maybeSingle();
      return data
        ? { stage: data.stage as string, data: (data.session_data ?? {}) as Record<string, any> }
        : { stage: "MENU", data: {} as Record<string, any> };
    }

    async function saveSession(stage: string, data: Record<string, any> = {}) {
      await supabase.from("nalo_ussd_sessions").upsert({
        session_id: SESSIONID,
        userid: USERID,
        msisdn: MSISDN,
        network: NETWORK_RAW,
        stage,
        session_data: data,
      }, { onConflict: "session_id" });
    }

    async function endSession() {
      await supabase.from("nalo_ussd_sessions").delete().eq("session_id", SESSIONID);
    }

    function reply(msg: string, keepOpen: boolean) {
      if (!keepOpen) {
        // fire-and-forget cleanup
        endSession().catch((e) => console.error(`[${reqId}] cleanup error:`, e));
      }
      return nalo(USERID, MSISDN, msg, keepOpen);
    }

    // First-time request → show main menu
    if (MSGTYPE) {
      await saveSession("MENU");
      return reply(MAIN_MENU, true);
    }

    const session = await getSession();
    console.log(`[${reqId}] Stage=${session.stage} data=${JSON.stringify(session.data)}`);

    switch (session.stage) {
      case "MENU": {
        if (USERDATA === "1") {
          await saveSession("BECE_QTY");
          return reply("Enter number of checkers to buy", true);
        }
        if (USERDATA === "2") {
          await saveSession("WASSCE_QTY");
          return reply("Enter number of checkers to buy", true);
        }
        if (USERDATA === "3") {
          await saveSession("FORMS_PAGE_1");
          return reply(FORMS_PAGE_1, true);
        }
        if (USERDATA === "4") {
          await saveSession("RETRIEVE");
          return reply("Please enter the transaction ID that was sent to you after Momo payment", true);
        }
        if (USERDATA === "#") {
          await saveSession("MENU_PAGE_2");
          return reply(MAIN_MENU_PAGE_2, true);
        }
        return reply("Invalid option.\n" + MAIN_MENU_PAGE_1, true);
      }

      case "MENU_PAGE_2": {
        if (USERDATA === "0") {
          await saveSession("MENU");
          return reply(MAIN_MENU_PAGE_1, true);
        }
        if (USERDATA === "5") {
          await saveSession("EMAIL_MENU");
          return reply("Select option to continue\n1. Link a new email\n2. View existing email", true);
        }
        if (USERDATA === "6") {
          return reply("Contact details 0557956020/0538848199", false);
        }
        if (USERDATA === "7") {
          return reply(UPDATES_MSG, false);
        }
        return reply("Invalid option.\n" + MAIN_MENU_PAGE_2, true);
      }

      case "FORMS_PAGE_1": {
        if (USERDATA === "0") {
          await saveSession("MENU");
          return reply(MAIN_MENU, true);
        }
        if (USERDATA.toLowerCase() === "z") {
          await saveSession("FORMS_PAGE_2");
          return reply(FORMS_PAGE_2, true);
        }
        const idx = parseInt(USERDATA);
        if ([1, 2, 3, 4].includes(idx)) {
          const form = FORMS[idx - 1];
          await saveSession("FORM_NAME", { formCode: form.code, formPrice: form.price });
          return reply("Enter your full name", true);
        }
        return reply("Invalid option.\n" + FORMS_PAGE_1, true);
      }

      case "FORMS_PAGE_2": {
        if (USERDATA === "0") {
          await saveSession("FORMS_PAGE_1");
          return reply(FORMS_PAGE_1, true);
        }
        if (USERDATA.toLowerCase() === "b") {
          await saveSession("MENU");
          return reply(MAIN_MENU, true);
        }
        const idx = parseInt(USERDATA);
        if ([5, 6, 7].includes(idx)) {
          const form = FORMS[idx - 1];
          await saveSession("FORM_NAME", { formCode: form.code, formPrice: form.price });
          return reply("Enter your full name", true);
        }
        return reply("Invalid option.\n" + FORMS_PAGE_2, true);
      }

      case "FORM_NAME": {
        const fullName = USERDATA.trim();
        if (fullName.length < 2 || !fullName.includes(" ")) {
          return reply("Please enter your full name (first and last).", true);
        }
        const { formCode, formPrice } = session.data;
        const total = formPrice + 0.5;
        const reference = `MV-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        try {
          await initiateCollection({
            msisdn: MSISDN,
            accountName: fullName,
            amount: total,
            reference,
            network: NETWORK_RAW.toUpperCase(),
            product: formCode,
            qty: 1,
            fullName,
          });
          console.log(`[${reqId}] FORM payment initiated form=${formCode} total=${total} ref=${reference} name=${fullName}`);
        } catch (err) {
          console.error(`[${reqId}] FORM payment error:`, err);
          return reply("Payment could not be initiated. Please try again or contact support.", false);
        }
        return reply(
          "Your request is being processed. If prompt delays dial *170#.\nContact 0557956020 if you need assistance with filling the forms.",
          false,
        );
      }

      case "WASSCE_QTY": {
        const qty = parseInt(USERDATA);
        if (isNaN(qty) || qty < 1) {
          return reply("Invalid quantity. Please enter a valid number.", true);
        }
        const price = qty >= 20 ? 17 : 25;
        const total = qty * price + (0.5 * qty);
        await saveSession("WASSCE_CONFIRM", { qty, total });
        return reply(
          `You are purchasing ${qty} WASSCE result checker(s) for GHC${total.toFixed(2)}\n1. Confirm\n2. Cancel\n0. Main menu`,
          true,
        );
      }

      case "WASSCE_CONFIRM": {
        if (USERDATA === "1") {
          const { qty, total } = session.data;
          const reference = `MV-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
          try {
            await initiateCollection({
              msisdn: MSISDN,
              accountName: "USSD Customer",
              amount: total,
              reference,
              network: NETWORK_RAW.toUpperCase(),
              product: "wassce",
              qty,
            });
            console.log(`[${reqId}] WASSCE payment initiated qty=${qty} total=${total} ref=${reference}`);
          } catch (err) {
            console.error(`[${reqId}] WASSCE payment error:`, err);
            return reply("Payment could not be initiated. Please try again or contact support.", false);
          }
          return reply(
            "Your purchase has been initiated. Please approve to confirm.\nDial *170# to approve if prompt delays.",
            false,
          );
        }
        if (USERDATA === "2") {
          return reply("Transaction cancelled. Thank you for using MOVA CONSULT.", false);
        }
        if (USERDATA === "0") {
          await saveSession("MENU");
          return reply(MAIN_MENU, true);
        }
        return reply("Invalid option.\n1. Confirm\n2. Cancel\n0. Main menu", true);
      }

      case "BECE_QTY": {
        const qty = parseInt(USERDATA);
        if (isNaN(qty) || qty < 1) {
          return reply("Invalid quantity. Please enter a valid number.", true);
        }
        const price = qty >= 20 ? 17 : 25;
        const total = qty * price + (0.5 * qty);
        await saveSession("BECE_CONFIRM", { qty, total });
        return reply(
          `You are purchasing ${qty} BECE result checker(s) for GHC${total.toFixed(2)}\n1. Confirm\n2. Cancel\n0. Main menu`,
          true,
        );
      }

      case "BECE_CONFIRM": {
        if (USERDATA === "1") {
          const { qty, total } = session.data;
          const reference = `MV-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
          try {
            await initiateCollection({
              msisdn: MSISDN,
              accountName: "USSD Customer",
              amount: total,
              reference,
              network: NETWORK_RAW.toUpperCase(),
              product: "bece",
              qty,
            });
            console.log(`[${reqId}] BECE payment initiated qty=${qty} total=${total} ref=${reference}`);
          } catch (err) {
            console.error(`[${reqId}] BECE payment error:`, err);
            return reply("Payment could not be initiated. Please try again or contact support.", false);
          }
          return reply(
            "Your purchase has been initiated. Please approve to confirm.\nDial *170# to approve if prompt delays.",
            false,
          );
        }
        if (USERDATA === "2") {
          return reply("Transaction cancelled. Thank you for using MOVA CONSULT.", false);
        }
        if (USERDATA === "0") {
          await saveSession("MENU");
          return reply(MAIN_MENU, true);
        }
        return reply("Invalid option.\n1. Confirm\n2. Cancel\n0. Main menu", true);
      }

      case "RETRIEVE": {
        retreivevouch(USERDATA);
        console.log(`[${reqId}] Retrieve txnId="${USERDATA}"`);
        return reply(
          `Looking up transaction ${USERDATA}... We will send details to your number shortly.`,
          false,
        );
      }

      case "EMAIL_MENU": {
        if (USERDATA === "1") {
          await saveSession("EMAIL_ENTER");
          return reply("Enter your email", true);
        }
        if (USERDATA === "2") {
          const linkdetails = await retreive(MSISDN);
          const email = linkdetails?.email;
          if (email == null) {
            return reply("No email linked to this number yet.", false);
          }
          return reply(email, false);
        }
        return reply("Invalid option.\n1. Link a new email\n2. View existing email", true);
      }

      case "EMAIL_ENTER": {
        linkemail(MSISDN, USERDATA);
        console.log(`[${reqId}] Linking email="${USERDATA}" for ${MSISDN}`);
        return reply(`Email ${USERDATA} has been linked to your account.`, false);
      }

      default: {
        await saveSession("MENU");
        return reply(MAIN_MENU, true);
      }
    }
  } catch (err) {
    console.error(`[${reqId}] Error:`, err);
    return new Response(
      JSON.stringify({ USERID: "", MSISDN: "", MSG: "System error. Please try again.", MSGTYPE: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
