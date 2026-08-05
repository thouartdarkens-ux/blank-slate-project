import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const BASE = `${SUPABASE_URL}/functions/v1/ussd`;

async function ussd(body: Record<string, unknown>) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data;
}

const sid = () => crypto.randomUUID();

// --- RETRIEVE OLD VOUCHER ---
Deno.test("Retrieve voucher flow", async () => {
  const sessionId = sid();
  // Start new session
  let r = await ussd({ sessionId, new: true, msisdn: "0551234567", message: "", network: 3 });
  assertEquals(r.reply, true);

  // Select option 3 (Retrieve old Checker)
  r = await ussd({ sessionId, new: false, msisdn: "0551234567", message: "3", network: 3 });
  assertEquals(r.reply, true);
  assertEquals(r.message.includes("transaction ID"), true);

  // Enter a reference
  r = await ussd({ sessionId, new: false, msisdn: "0551234567", message: "TEST-REF-123", network: 3 });
  assertEquals(r.reply, false);
  // Should either succeed or fail gracefully
  console.log("Retrieve response:", r.message);
});

// --- LINK EMAIL ---
Deno.test("Link email flow", async () => {
  const sessionId = sid();
  // Start new session
  let r = await ussd({ sessionId, new: true, msisdn: "0551234567", message: "", network: 3 });
  assertEquals(r.reply, true);

  // Select option 4 (Link email)
  r = await ussd({ sessionId, new: false, msisdn: "0551234567", message: "4", network: 3 });
  assertEquals(r.reply, true);
  assertEquals(r.message.includes("Link a new email"), true);

  // Select option 1 (Link a new email)
  r = await ussd({ sessionId, new: false, msisdn: "0551234567", message: "1", network: 3 });
  assertEquals(r.reply, true);
  assertEquals(r.message.includes("Enter your email"), true);

  // Enter email
  r = await ussd({ sessionId, new: false, msisdn: "0551234567", message: "test@example.com", network: 3 });
  assertEquals(r.reply, false);
  console.log("Link email response:", r.message);
});

// --- CHECK LINKED EMAIL ---
Deno.test("Check linked email flow", async () => {
  const sessionId = sid();
  // Start new session
  let r = await ussd({ sessionId, new: true, msisdn: "0551234567", message: "", network: 3 });
  assertEquals(r.reply, true);

  // Select option 4 (Link email)
  r = await ussd({ sessionId, new: false, msisdn: "0551234567", message: "4", network: 3 });
  assertEquals(r.reply, true);

  // Select option 2 (View existing email)
  r = await ussd({ sessionId, new: false, msisdn: "0551234567", message: "2", network: 3 });
  assertEquals(r.reply, false);
  console.log("Check email response:", r.message);
});
