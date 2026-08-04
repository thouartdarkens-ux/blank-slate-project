import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type HubtelType = "response" | "release" | "AddToCart";

function hubtel(
  sessionId: string,
  type: HubtelType,
  message: string,
  opts: {
    label?: string;
    dataType?: "display" | "input";
    fieldType?: string;
    clientState?: string;
    item?: { ItemName: string; Qty: number; Price: number };
  } = {},
) {
  const payload: Record<string, unknown> = {
    SessionId: sessionId,
    Type: type,
    Message: message,
    Label: opts.label ?? message.split("\n")[0],
    DataType: opts.dataType ?? (type === "response" ? "input" : "display"),
    FieldType: opts.fieldType ?? "text",
  };
  if (opts.clientState) payload.ClientState = opts.clientState;
  if (opts.item) payload.Item = opts.item;
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MAIN_MENU_PAGE_1 =
  `Welcome to MOVA CONSULT\nMain Menu\n1. Buy BECE Checker\n2. Buy WASSCE/NOVDEC Checker\n3. Buy Tertiary Admission Forms\n4. Retrieve old Checker\n#. Next`;
const MAIN_MENU_PAGE_2 =
  `Main Menu\n5. Link email\n6. Contact support\n7. Updates\n0. Back`;
const MAIN_MENU = MAIN_MENU_PAGE_1;

const UPDATES_MSG =
  "Dial *920*138# for BECE news. Likely Release Date: 15 July 2026. Current Step: Result Quality check. WhatsApp: 0241840979 (Final Result only).";

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
  console.log("[hubtelussdmain] retrieve voucher:", await response.json());
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
  console.log("[hubtelussdmain] link email:", await response.json());
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
  console.log("[hubtelussdmain] retrieve email:", data);
  return data;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const reqId = crypto.randomUUID().slice(0, 8);
  let SESSIONID = "";

  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return hubtel("", "release", "Empty request body.");
    }
    const body = JSON.parse(rawBody);

    const TYPE: string = (body.Type ?? "").toString();
    const MSISDN: string = (body.Mobile ?? "").toString();
    const USERDATA: string = (body.Message ?? "").toString().trim();
    const SERVICE_CODE: string = (body.ServiceCode ?? "").toString();
    const NETWORK_RAW: string = (body.Operator ?? "").toString();
    const CLIENT_STATE: string = (body.ClientState ?? "").toString();
    SESSIONID = (body.SessionId ?? "").toString();
    const isFirst = TYPE.toLowerCase() === "initiation";

    console.log(
      `[${reqId}] sid=${SESSIONID} type=${TYPE} msisdn=${MSISDN} operator=${NETWORK_RAW} clientState=${CLIENT_STATE} message="${USERDATA}"`,
    );

    if (!SESSIONID) {
      return hubtel("", "release", "Missing SessionId.");
    }

    if (TYPE.toLowerCase() === "timeout") {
      return hubtel(SESSIONID, "release", "Session cancelled.");
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
        userid: SERVICE_CODE,
        msisdn: MSISDN,
        network: NETWORK_RAW,
        stage,
        session_data: data,
      }, { onConflict: "session_id" });
    }

    async function endSession() {
      await supabase.from("nalo_ussd_sessions").delete().eq("session_id", SESSIONID);
    }

    function reply(msg: string, keepOpen: boolean, stage?: string) {
      if (!keepOpen) {
        endSession().catch((e) => console.error(`[${reqId}] cleanup error:`, e));
      }
      return hubtel(SESSIONID, keepOpen ? "response" : "release", msg, {
        dataType: keepOpen ? "input" : "display",
        clientState: stage,
      });
    }

    function cart(msg: string, itemName: string, qty: number, price: number) {
      return hubtel(SESSIONID, "AddToCart", msg, {
        dataType: "display",
        item: { ItemName: itemName, Qty: qty, Price: price },
      });
    }

    if (isFirst) {
      await saveSession("MENU");
      return reply(MAIN_MENU, true, "MENU");
    }

    const session = await getSession();
    console.log(`[${reqId}] Stage=${session.stage} data=${JSON.stringify(session.data)}`);

    switch (session.stage) {
      case "MENU": {
        if (USERDATA === "1") {
          await saveSession("BECE_QTY");
          return reply("Enter Quantity of checkers to buy", true, "BECE_QTY");
        }
        if (USERDATA === "2") {
          await saveSession("WASSCE_QTY");
          return reply("Enter Quantity of checkers to buy", true, "WASSCE_QTY");
        }
        if (USERDATA === "3") {
          await saveSession("FORMS_PAGE_1");
          return reply(FORMS_PAGE_1, true, "FORMS_PAGE_1");
        }
        if (USERDATA === "4") {
          await saveSession("RETRIEVE");
          return reply("Please enter the transaction ID that was sent to you after Momo payment", true, "RETRIEVE");
        }
        if (USERDATA === "#") {
          await saveSession("MENU_PAGE_2");
          return reply(MAIN_MENU_PAGE_2, true, "MENU_PAGE_2");
        }
        return reply("Invalid option.\n" + MAIN_MENU_PAGE_1, true, "MENU");
      }

      case "MENU_PAGE_2": {
        if (USERDATA === "0") {
          await saveSession("MENU");
          return reply(MAIN_MENU_PAGE_1, true, "MENU");
        }
        if (USERDATA === "5") {
          await saveSession("EMAIL_MENU");
          return reply("Select option to continue\n1. Link a new email\n2. View existing email", true, "EMAIL_MENU");
        }
        if (USERDATA === "6") {
          return reply("Contact details 0241840979/0538848199", false);
        }
        if (USERDATA === "7") {
          return reply(UPDATES_MSG, false);
        }
        return reply("Invalid option.\n" + MAIN_MENU_PAGE_2, true, "MENU_PAGE_2");
      }

      case "FORMS_PAGE_1": {
        if (USERDATA === "0") {
          await saveSession("MENU");
          return reply(MAIN_MENU, true, "MENU");
        }
        if (USERDATA.toLowerCase() === "z") {
          await saveSession("FORMS_PAGE_2");
          return reply(FORMS_PAGE_2, true, "FORMS_PAGE_2");
        }
        const idx = parseInt(USERDATA);
        if ([1, 2, 3, 4].includes(idx)) {
          const form = FORMS[idx - 1];
          await saveSession("FORM_NAME", { formCode: form.code, formPrice: form.price });
          return reply("Enter your full name", true, "FORM_NAME");
        }
        return reply("Invalid option.\n" + FORMS_PAGE_1, true, "FORMS_PAGE_1");
      }

      case "FORMS_PAGE_2": {
        if (USERDATA === "0") {
          await saveSession("FORMS_PAGE_1");
          return reply(FORMS_PAGE_1, true, "FORMS_PAGE_1");
        }
        if (USERDATA.toLowerCase() === "b") {
          await saveSession("MENU");
          return reply(MAIN_MENU, true, "MENU");
        }
        const idx = parseInt(USERDATA);
        if ([5, 6, 7].includes(idx)) {
          const form = FORMS[idx - 1];
          await saveSession("FORM_NAME", { formCode: form.code, formPrice: form.price });
          return reply("Enter your full name", true, "FORM_NAME");
        }
        return reply("Invalid option.\n" + FORMS_PAGE_2, true, "FORMS_PAGE_2");
      }

      case "FORM_NAME": {
        const fullName = USERDATA.trim();
        if (fullName.length < 2 || !fullName.includes(" ")) {
          return reply("Please enter your full name (first and last).", true, "FORM_NAME");
        }
        const { formCode, formPrice } = session.data;
        const total = Number(formPrice) + 0.5;
        const reference = `MV-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        await saveSession("AWAITING_PAYMENT", {
          qty: 1,
          total,
          product: formCode,
          fullName,
          reference,
          msisdn: MSISDN,
        });
        console.log(`[${reqId}] FORM AddToCart form=${formCode} total=${total} ref=${reference} name=${fullName}`);
        return cart(
          "The request has been submitted. Please wait for a payment prompt soon. Contact 0241840979 for assistance with filling the forms.",
          `${formCode.replace(/_/g, " ")} Admission Form`,
          1,
          Number(total),
        );
      }

      case "WASSCE_QTY": {
        const qty = parseInt(USERDATA);
        if (isNaN(qty) || qty < 1) {
          return reply("Invalid quantity. Please enter a valid number.", true, "WASSCE_QTY");
        }
        const price = qty >= 20 ? 17 : 25;
        const total = qty * price + (0.5 * qty);
        await saveSession("WASSCE_CONFIRM", { qty, total });
        return reply(
          `You are purchasing ${qty} WASSCE result checker(s) for GHC${total.toFixed(2)}\n1. Confirm\n2. Cancel\n0. Main menu`,
          true,
          "WASSCE_CONFIRM",
        );
      }

      case "WASSCE_CONFIRM": {
        if (USERDATA === "1") {
          const { qty, total } = session.data;
          const reference = `MV-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
          await saveSession("AWAITING_PAYMENT", {
            qty,
            total,
            product: "wassce",
            reference,
            msisdn: MSISDN,
          });
          console.log(`[${reqId}] WASSCE AddToCart qty=${qty} total=${total} ref=${reference}`);
          return cart(
            "The request has been submitted. Please wait for a payment prompt soon",
            `WASSCE Result Checker x${qty}`,
            qty,
            Number(total),
          );
        }
        if (USERDATA === "2") {
          return reply("Transaction cancelled. Thank you for using MOVA CONSULT.", false);
        }
        if (USERDATA === "0") {
          await saveSession("MENU");
          return reply(MAIN_MENU, true, "MENU");
        }
        return reply("Invalid option.\n1. Confirm\n2. Cancel\n0. Main menu", true, "WASSCE_CONFIRM");
      }

      case "BECE_QTY": {
        const qty = parseInt(USERDATA);
        if (isNaN(qty) || qty < 1) {
          return reply("Invalid quantity. Please enter a valid number.", true, "BECE_QTY");
        }
        const price = qty >= 20 ? 17 : 25;
        const total = qty * price + (0.5 * qty);
        await saveSession("BECE_CONFIRM", { qty, total });
        return reply(
          `You are purchasing ${qty} BECE result checker(s) for GHC${total.toFixed(2)}\n1. Confirm\n2. Cancel\n0. Main menu`,
          true,
          "BECE_CONFIRM",
        );
      }

      case "BECE_CONFIRM": {
        if (USERDATA === "1") {
          const { qty, total } = session.data;
          const reference = `MV-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
          await saveSession("AWAITING_PAYMENT", {
            qty,
            total,
            product: "bece",
            reference,
            msisdn: MSISDN,
          });
          console.log(`[${reqId}] BECE AddToCart qty=${qty} total=${total} ref=${reference}`);
          return cart(
            "The request has been submitted. Please wait for a payment prompt soon",
            `BECE Result Checker x${qty}`,
            qty,
            Number(total),
          );
        }
        if (USERDATA === "2") {
          return reply("Transaction cancelled. Thank you for using MOVA CONSULT.", false);
        }
        if (USERDATA === "0") {
          await saveSession("MENU");
          return reply(MAIN_MENU, true, "MENU");
        }
        return reply("Invalid option.\n1. Confirm\n2. Cancel\n0. Main menu", true, "BECE_CONFIRM");
      }

      case "RETRIEVE": {
        retreivevouch(USERDATA);
        console.log(`[${reqId}] Retrieve txnId="${USERDATA}"`);
        return reply(
          `Looking up transaction ${USERDATA}. We will send details to your number shortly.`,
          false,
        );
      }

      case "EMAIL_MENU": {
        if (USERDATA === "1") {
          await saveSession("EMAIL_ENTER");
          return reply("Enter your email", true, "EMAIL_ENTER");
        }
        if (USERDATA === "2") {
          const linkdetails = await retreive(MSISDN);
          const email = linkdetails?.email;
          if (email == null) {
            return reply("No email linked to this number yet.", false);
          }
          return reply(email, false);
        }
        return reply("Invalid option.\n1. Link a new email\n2. View existing email", true, "EMAIL_MENU");
      }

      case "EMAIL_ENTER": {
        linkemail(MSISDN, USERDATA);
        console.log(`[${reqId}] Linking email="${USERDATA}" for ${MSISDN}`);
        return reply(`Email ${USERDATA} has been linked to your account.`, false);
      }

      default: {
        await saveSession("MENU");
        return reply(MAIN_MENU, true, "MENU");
      }
    }
  } catch (err) {
    console.error(`[${reqId}] Error:`, err);
    return new Response(
      JSON.stringify({
        SessionId: SESSIONID,
        Type: "release",
        Message: "System error. Please try again.",
        Label: "Error",
        DataType: "display",
        FieldType: "text",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
