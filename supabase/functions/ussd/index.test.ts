import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ussd`;

async function callUssd(message: string, networkCode = "MTN") {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      session: "TEST_SESSION_" + Date.now(),
      message,
      phone: "+233551234567",
      network_code: networkCode,
      service_code: "*415*123#",
    }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

Deno.test("Level 0 - Initial request shows bundle menu", async () => {
  const { status, body } = await callUssd("");
  assertEquals(status, 200);
  assertEquals(body.type, "continue");
  console.log("Menu:", body.message);
  // Should list bundles with numbered options
  assertEquals(body.message.includes("1."), true, "Should have at least one bundle option");
});

Deno.test("Level 1 - Bundle selected, asks for phone", async () => {
  const { status, body } = await callUssd("1");
  assertEquals(status, 200);
  assertEquals(body.type, "continue");
  console.log("Response:", body.message);
  assertEquals(body.message.toLowerCase().includes("phone"), true);
});

Deno.test("Level 2 - Phone entered, asks to confirm", async () => {
  const { status, body } = await callUssd("1*0551234567");
  assertEquals(status, 200);
  assertEquals(body.type, "continue");
  console.log("Response:", body.message);
  assertEquals(body.message.includes("0551234567"), true);
});

Deno.test("Level 3 - Phone confirmed, returns charge with metadata", async () => {
  const { status, body } = await callUssd("1*0551234567*0551234567");
  assertEquals(status, 200);
  assertEquals(body.type, "charge");
  console.log("Charge response:", JSON.stringify(body, null, 2));
  // Verify data.amount exists
  assertEquals(typeof body.data?.amount, "number", "Should have amount");
  // Verify metadata custom_fields
  const fields = body.data?.metadata?.custom_fields;
  assertEquals(Array.isArray(fields), true, "Should have custom_fields array");
  const fieldNames = fields.map((f: any) => f.variable_name);
  assertEquals(fieldNames.includes("network"), true, "Should have network field");
  assertEquals(fieldNames.includes("bundle"), true, "Should have bundle field");
  assertEquals(fieldNames.includes("phone"), true, "Should have phone field");
  assertEquals(fieldNames.includes("price"), true, "Should have price field");
});

Deno.test("Level 3 - Mismatched phones returns end", async () => {
  const { status, body } = await callUssd("1*0551234567*0559999999");
  assertEquals(status, 200);
  assertEquals(body.type, "end");
  console.log("Mismatch response:", body.message);
});

Deno.test("Unsupported network returns end", async () => {
  const { status, body } = await callUssd("", "XYZ");
  assertEquals(status, 200);
  assertEquals(body.type, "end");
  console.log("Unsupported network:", body.message);
  await Promise.resolve(); // ensure body consumed
});
