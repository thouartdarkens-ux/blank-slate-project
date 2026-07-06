## Plan: Replace Moolre payment in `naloussd` with new collection API

Replace the Moolre `initiatePayment` call inside `supabase/functions/naloussd/index.ts` with a new `initiateCollection` call hitting the new collection endpoint, signed with HMAC-SHA256 and authenticated with a pre-issued Basic Auth token.

### 1. Secrets to add (via secrets tool)

- `COLLECTION_BASE_URL` — e.g. `https://api.<provider>.com` (the `{{baseURL}}`)
- `COLLECTION_MERCHANT_ID` — e.g. `hCuK9z9yoYMZ8yvtH7LUHP`
- `COLLECTION_MERCHANT_SECRET` — HMAC key (server-side only)
- `COLLECTION_BASIC_TOKEN` — the pre-issued token, sent verbatim as `Authorization: Basic <token>` (e.g. `fc4c5880…8070`)
- `COLLECTION_CALLBACK_URL` — public callback URL the provider will hit

### 2. New helper in `naloussd/index.ts`

```ts
async function hmacSha256Hex(key: string, message: string) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function initiateCollection({
  msisdn, accountName, amount, reference, network, product, qty,
}: {
  msisdn: string; accountName: string; amount: number;
  reference: string; network: string;
  product: "bece" | "wassce"; qty: number;
}) {
  const merchantId = Deno.env.get("COLLECTION_MERCHANT_ID")!;
  const secret     = Deno.env.get("COLLECTION_MERCHANT_SECRET")!;
  const baseUrl    = Deno.env.get("COLLECTION_BASE_URL")!;
  const callback   = Deno.env.get("COLLECTION_CALLBACK_URL")!;
  const basicToken = Deno.env.get("COLLECTION_BASIC_TOKEN")!;

  // Concatenate in order, no separators
  const message = `${merchantId}${msisdn}${amount}${reference}`;
  const trans_hash = await hmacSha256Hex(secret, message);

  const body = {
    merchant_id: merchantId,
    service_name: "MOMO_TRANSACTION",
    trans_hash,
    account_number: msisdn,
    account_name: accountName || "USSD Customer",
    description: `${product.toUpperCase()} checker x${qty}`,
    reference,
    callback,
    network,                  // "MTN" | "TELECEL" | "AT"
    amount,
    extra_data: { product, amount, quantity: qty },
  };

  const res = await fetch(`${baseUrl}/clientapi/collection/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${basicToken}`,
    },
    body: JSON.stringify(body),
  });
  return await res.json();
}
```

### 3. Wire into WASSCE_CONFIRM / BECE_CONFIRM

Replace `initiatePayment({...})` with `initiateCollection({...})`. Pass `NETWORK_RAW` directly (e.g. `"MTN"`), `product: "wassce"` or `"bece"`, `qty`, `amount: total`, and a unique `reference` per attempt (e.g. `MV-${Date.now()}-${shortRand}`). Drop `NETWORK_CODE`, `CHANNEL_MAP`, and the Moolre `initiatePayment` from this file.

### 4. Non-goals

- No DB migration (sessions table unchanged).
- No frontend changes.
- Provider callback/webhook handler is a follow-up step.

### Open question

`account_name` — USSD has no name input. Default to `"USSD Customer"` unless you'd prefer to look it up from the email-linked profile.
