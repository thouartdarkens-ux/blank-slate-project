import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(message: string, reply: boolean) {
  return new Response(JSON.stringify({ message, reply }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const NETWORK_MAP: Record<number, string> = {
  3: "MTN",
  5: "AirtelTigo",
  6: "Telecel",
};

const CHANNEL_MAP: Record<number, string> = {
  3: "13", // MTN
  5: "7",  // AirtelTigo
  6: "6",  // Telecel
};

const MAIN_MENU = `Welcome to MOVA CONSULT\nMain Menu\n1. Buy WASSCE/NOVDEC Checker\n2. Buy BECE Checker\n3. Retrieve old Checker\n4. Link email\n5. Contact support`;

async function initiatePayment({
  network,
  msisdn,
  amount,
  sessionId,
  externalRef,
}: {
  network: number;
  msisdn: string;
  amount: number;
  sessionId: string;
  externalRef: string;
}) {
  const channel = CHANNEL_MAP[network];
  if (!channel) throw new Error(`Unsupported network: ${network}`);

  const response = await fetch("https://api.moolre.com/open/transact/payment", {
    method: "POST",
    headers: {
      "X-API-USER": "Your Username",
      "X-API-PUBKEY": "YOUR_PUBLIC_KEY",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: 1,
      channel,
      currency: "GHS",
      payer: msisdn,
      amount: String(amount),
      externalref: externalRef,
      otpcode: "",
      reference: "MOVA CONSULT Checker Purchase",
      sessionid: sessionId,
      accountnumber: "Your Moolre Account Number",
    }),
  });

  const data = await response.json();
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
      return new Response(JSON.stringify({ message: "Empty request body.", reply: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = JSON.parse(rawBody);
    const { sessionId, new: isNew, msisdn, message, network, extension, data: ussdData } = body;
    const input = (message ?? "").trim();
    const networkName = NETWORK_MAP[network] ?? `Unknown(${network})`;

    console.log(`[${reqId}] sid=${sessionId} new=${isNew} msisdn=${msisdn} network=${networkName} msg="${input}"`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    async function getSession() {
      const { data } = await supabase
        .from("ussd_sessions")
        .select("stage, session_data")
        .eq("session_id", sessionId)
        .maybeSingle();
      return data ? { stage: data.stage, data: data.session_data ?? {} } : { stage: "MENU", data: {} };
    }

    async function saveSession(stage: string, data: Record<string, any> = {}) {
      await supabase.from("ussd_sessions").upsert({
        session_id: sessionId,
        msisdn,
        stage,
        session_data: data,
      });
    }

    // --- NEW SESSION ---
    if (isNew) {
      await saveSession("MENU");
      console.log(`[${reqId}] New session → MENU`);
      return json(MAIN_MENU, true);
    }

    const session = await getSession();
    console.log(`[${reqId}] Stage=${session.stage} data=${JSON.stringify(session.data)}`);

    // --- STATE MACHINE ---
    switch (session.stage) {
      case "MENU": {
        if (input === "1") {
          await saveSession("WASSCE_QTY");
          return json("Enter quantity to buy (GHS25 per checker, 20 or more @17)", true);
        }
        if (input === "2") {
          await saveSession("BECE_QTY");
          return json("Enter quantity to buy (GHS25 per checker, 20 or more @17)", true);
        }
        if (input === "3") {
          await saveSession("RETRIEVE");
          return json("Please enter the transaction ID that was sent to you after Momo payment", true);
        }
        if (input === "4") {
          await saveSession("EMAIL_MENU");
          return json("Select option to continue\n1. Link a new email\n2. View existing email", true);
        }
        if (input === "5") {
          return json("Contact details 0557956020/0538848199", false);
        }
        return json("Invalid option.\n" + MAIN_MENU, true);
      }

      // --- WASSCE ---
      case "WASSCE_QTY": {
        const qty = parseInt(input);
        if (isNaN(qty) || qty < 1) {
          return json("Invalid quantity. Please enter a valid number.", true);
        }
        const price = qty >= 20 ? 17 : 25;
        const total = qty * price;
        await saveSession("WASSCE_CONFIRM", { qty, total });
        return json(
          `You are purchasing ${qty} WASSCE result checker(s) for GHC${total}\n1. Confirm\n2. Cancel\n0. Main menu`,
          true
        );
      }

      case "WASSCE_CONFIRM": {
        if (input === "1") {
          const { qty, total } = session.data;
          const externalRef = crypto.randomUUID();
          try {
            await initiatePayment({ network, msisdn, amount: total, sessionId, externalRef });
            console.log(`[${reqId}] WASSCE payment initiated | msisdn=${msisdn} network=${networkName} qty=${qty} total=${total} ref=${externalRef}`);
          } catch (err) {
            console.error(`[${reqId}] WASSCE payment error:`, err);
            return json("Payment could not be initiated. Please try again or contact support.", false);
          }
          return json(
            "Your purchase has been initiated. Please approve to confirm.\nDial *170# to approve if prompt delays.",
            false
          );
        }
        if (input === "2") {
          return json("Transaction cancelled. Thank you for using MOVA CONSULT.", false);
        }
        if (input === "0") {
          await saveSession("MENU");
          return json(MAIN_MENU, true);
        }
        return json("Invalid option.\n1. Confirm\n2. Cancel\n0. Main menu", true);
      }

      // --- BECE ---
      case "BECE_QTY": {
        const qty = parseInt(input);
        if (isNaN(qty) || qty < 1) {
          return json("Invalid quantity. Please enter a valid number.", true);
        }
        const price = qty >= 20 ? 17 : 25;
        const total = qty * price;
        await saveSession("BECE_CONFIRM", { qty, total });
        return json(
          `You are purchasing ${qty} BECE result checker(s) for GHC${total}\n1. Confirm\n2. Cancel\n0. Main menu`,
          true
        );
      }

      case "BECE_CONFIRM": {
        if (input === "1") {
          const { qty, total } = session.data;
          const externalRef = crypto.randomUUID();
          try {
            await initiatePayment({ network, msisdn, amount: total, sessionId, externalRef });
            console.log(`[${reqId}] BECE payment initiated | msisdn=${msisdn} network=${networkName} qty=${qty} total=${total} ref=${externalRef}`);
          } catch (err) {
            console.error(`[${reqId}] BECE payment error:`, err);
            return json("Payment could not be initiated. Please try again or contact support.", false);
          }
          return json(
            "Your purchase has been initiated. Please approve to confirm.\nDial *170# to approve if prompt delays.",
            false
          );
        }
        if (input === "2") {
          return json("Transaction cancelled. Thank you for using MOVA CONSULT.", false);
        }
        if (input === "0") {
          await saveSession("MENU");
          return json(MAIN_MENU, true);
        }
        return json("Invalid option.\n1. Confirm\n2. Cancel\n0. Main menu", true);
      }

      // --- RETRIEVE ---
      case "RETRIEVE": {
        console.log(`[${reqId}] Retrieve reference="${input}"`);
        const apiKey = Deno.env.get("VOUCHER_API_KEY_NEW");
        try {
          const res = await fetch(
            `https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/get-voucher-history?reference=${encodeURIComponent(input)}`,
            { headers: { "x-api-key": apiKey ?? "" } }
          );
          const resBody = await res.text();
          console.log(`[${reqId}] get-voucher-history status=${res.status} response=${resBody}`);
          if (res.ok) {
            return json("You shall receive an SMS containing your voucher.", false);
          }
          return json("Could not retrieve your voucher. Please try again or contact support.", false);
        } catch (err) {
          console.error(`[${reqId}] get-voucher-history error:`, err);
          return json("System error. Please try again later.", false);
        }
      }

      // --- LINK EMAIL ---
      case "EMAIL_MENU": {
        if (input === "1") {
          await saveSession("EMAIL_ENTER");
          return json("Enter your email", true);
        }
        if (input === "2") {
          const apiKey = Deno.env.get("VOUCHER_API_KEY_NEW");
          try {
            const res = await fetch(
              `https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/get-email-by-phone?phone_number=${encodeURIComponent(msisdn)}`,
              { headers: { "x-api-key": apiKey ?? "" } }
            );
            const resBody = await res.text();
            console.log(`[${reqId}] get-email-by-phone status=${res.status} response=${resBody}`);
            if (res.ok) {
              const data = JSON.parse(resBody);
              const email = data?.email || "No email found";
              return json(`Email linked: ${email}`, false);
            }
            return json("No email linked to this number yet.", false);
          } catch (err) {
            console.error(`[${reqId}] get-email-by-phone error:`, err);
            return json("Could not retrieve email. Please try again.", false);
          }
        }
        return json("Invalid option.\n1. Link a new email\n2. View existing email", true);
      }

      case "EMAIL_ENTER": {
        console.log(`[${reqId}] Linking email="${input}" for ${msisdn}`);
        const apiKey = Deno.env.get("VOUCHER_API_KEY_NEW");
        try {
          const res = await fetch(
            "https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/store-phone-email",
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-api-key": apiKey ?? "" },
              body: JSON.stringify({
                phone_number: msisdn,
                email: input,
              }),
            }
          );
          const resBody = await res.text();
          console.log(`[${reqId}] store-phone-email status=${res.status} response=${resBody}`);
          if (res.ok) {
            return json("Email linked successfully.", false);
          }
          return json("Could not link email. Please try again.", false);
        } catch (err) {
          console.error(`[${reqId}] store-phone-email error:`, err);
          return json("System error. Please try again later.", false);
        }
      }

      default: {
        await saveSession("MENU");
        return json(MAIN_MENU, true);
      }
    }
  } catch (err) {
    console.error(`[${reqId}] Error:`, err);
    return new Response(JSON.stringify({ message: "System error. Please try again.", reply: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
