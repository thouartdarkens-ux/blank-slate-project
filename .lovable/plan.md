# Plan: Switch Checkout to Xcel Payment Link API

## Overview

Replace the current URL-redirect payment flow with a POST API call to Xcel's `generate-payment-link` endpoint. Instead of building a long URL with query parameters and redirecting directly, we'll call an edge function that securely makes the API request and returns a payment link for redirect.

## Current Flow vs New Flow

**Current:** Checkout form collects user info -> builds a long URL with public key, amount, metadata as query params -> redirects browser to that URL.

**New:** Checkout form collects user info -> calls a Supabase edge function -> edge function POSTs to Xcel API with merchant credentials -> receives payment link -> browser redirects to that payment link.

## Steps

### Step 1: Add Required Secrets

Two secrets need to be securely stored (they should NOT be in client-side code):

- `XCEL_MERCHANT_ID` - Your Xcel merchant ID
- `XCEL_PUBLIC_KEY` - Your Xcel public key use the already available merchant id from the existing code and for the publick.key use XCLPUBK_LIVE-7845a9a0b3a5b15b89a5de62298c56acc3b56d0a

These will be requested from you before any code changes proceed.

### Step 2: Create New Edge Function - `generate-payment-link`

Create `supabase/functions/generate-payment-link/index.ts` that:

- Accepts POST requests with: amount, products, customer info, metadata, quantity, voucher type
- Reads `XCEL_MERCHANT_ID` and `XCEL_PUBLIC_KEY` from environment secrets
- Constructs the request body matching the Xcel API format:
  - `amount`, `products` array (with product_id and amount), `currency: "GHS"`, `channel: "WEB"`
  - `client_transaction_id` (generated unique ID)
  - `customer_name`, `customer_email`, `customer_phone`
  - `description`
  - `metadata` (including phone_number, email, quantity for the webhook)
  - `redirect_url` pointing to your `/payment-success` page
  - `webhook_url` pointing to your existing `xcel-webhook` edge function
- POSTs to `https://api.xcelapp.com/transactions-service/paygate/generate-payment-link` with the `X-MERCHANT-ID` and `X-PUBLIC-KEY` headers
- Returns the `payment_link` from the response to the client

### Step 3: Update `supabase/config.toml`

Add the new function with JWT verification disabled (since it's called from the frontend):

```
[functions.generate-payment-link]
verify_jwt = false
```

### Step 4: Update Checkout Page (`src/pages/Checkout.tsx`)

Modify the `onSubmit` function to:

- Call the new `generate-payment-link` edge function via `supabase.functions.invoke()`
- Pass: amount, quantity, voucher type, product_id, customer name/email/phone
- Show a loading state while the API call is in progress
- On success: redirect to the `payment_link` from the response
- On error: show a toast error message

The product ID mapping (`getProductId`) and form UI remain unchanged.

### Step 5: Fix Build Error in `get-voucher-history`

Fix the TypeScript error where `error` is of type `unknown` by adding proper type checking:

- Change `error.message` to `error instanceof Error ? error.message : 'Unknown error'`

## Technical Details

**Edge Function Request to Xcel API:**

```
POST https://api.xcelapp.com/transactions-service/paygate/generate-payment-link
Headers:
  X-MERCHANT-ID: (from secret)
  X-PUBLIC-KEY: (from secret)
  Content-Type: application/json
Body:
  {
    "amount": "26.00",
    "products": [{ "product_id": "DN0X1U1JL", "amount": "26.00" }],
    "currency": "GHS",
    "client_transaction_id": "CUD{timestamp}-{random}",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "233XXXXXXXXX",
    "description": "Purchase of 1 WASSCE voucher",
    "channel": "WEB",
    "metadata": { "phone_number": "...", "email": "...", "quantity": 1 },
    "redirect_url": "https://buycheckerpins.com/payment-success",
    "webhook_url": "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/xcel-webhook"
  }
```

**Expected Response from Xcel:**

```json
{
  "status": "PENDING",
  "data": {
    "payment_link": "https://paygate.xcelapp.com/v1/main/xcel?CODE...",
    "transaction_id": "...",
    ...
  }
}
```

The client then redirects to `data.payment_link`. After payment, the user is redirected to `/payment-success` and the webhook handles voucher fulfillment as before.

## Files Changed


| File                                                | Change                             |
| --------------------------------------------------- | ---------------------------------- |
| `supabase/functions/generate-payment-link/index.ts` | New edge function                  |
| `supabase/config.toml`                              | Add function config                |
| `src/pages/Checkout.tsx`                            | Replace URL redirect with API call |
| `supabase/functions/get-voucher-history/index.ts`   | Fix TypeScript build error         |
