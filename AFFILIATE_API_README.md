# Affiliate API Endpoints

Two public (no-auth) Supabase Edge Functions for reading and updating affiliate data.

**Base URL:** `https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1`

No authentication headers required. Both endpoints accept `GET` (read) and `PATCH` (update) requests.

---

## 1. Affiliate Withdrawals API

**Endpoint:** `/api-affiliate-withdrawals`

### GET — List all withdrawals

```bash
curl "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliate-withdrawals"
```

**Optional query parameters:**

| Parameter       | Type   | Description                          |
|-----------------|--------|--------------------------------------|
| `id`            | uuid   | Fetch a single withdrawal by ID      |
| `affiliate_id`  | uuid   | Filter by affiliate                   |
| `status`        | string | Filter by status: `pending`, `paid`, `rejected` |
| `limit`         | number | Results per page (default: 100)      |
| `page`          | number | Page number (default: 1)             |

**Example — filter by status:**

```bash
curl "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliate-withdrawals?status=pending"
```

**Example — get a single withdrawal:**

```bash
curl "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliate-withdrawals?id=abc-123-uuid"
```

**Response (list):**

```json
{
  "withdrawals": [
    {
      "id": "uuid",
      "affiliate_id": "uuid",
      "amount": 500.00,
      "status": "pending",
      "notes": "Cash out to momo",
      "momo_number": "0551234567",
      "momo_name": "John Doe",
      "requested_at": "2026-07-07T10:00:00Z",
      "processed_at": null,
      "created_at": "2026-07-07T10:00:00Z",
      "updated_at": "2026-07-07T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 100
}
```

### PATCH — Update a withdrawal

```bash
curl -X PATCH \
  "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliate-withdrawals" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "abc-123-uuid",
    "status": "paid",
    "notes": "Sent via MTN momo"
  }'
```

**Updatable fields:**

| Field           | Type    | Description                                    |
|-----------------|---------|------------------------------------------------|
| `affiliate_id`  | uuid    | Reassign to a different affiliate              |
| `amount`        | number  | Withdrawal amount in GHS                        |
| `status`        | string  | `pending`, `paid`, or `rejected`                |
| `notes`         | string  | Admin notes                                     |
| `momo_number`   | string  | Mobile money number                             |
| `momo_name`     | string  | Name on the momo account                        |
| `processed_at`  | string  | ISO timestamp (auto-set when status changes)   |

> When `status` is changed from `pending` to `paid` or `rejected`, `processed_at` is automatically stamped.

**Response:**

```json
{
  "withdrawal": {
    "id": "uuid",
    "affiliate_id": "uuid",
    "amount": 500.00,
    "status": "paid",
    "notes": "Sent via MTN momo",
    "processed_at": "2026-07-07T12:30:00Z",
    "updated_at": "2026-07-07T12:30:00Z"
  }
}
```

---

## 2. Affiliates API

**Endpoint:** `/api-affiliates`

### GET — List all affiliates

```bash
curl "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliates"
```

**Optional query parameters:**

| Parameter  | Type   | Description                          |
|------------|--------|--------------------------------------|
| `id`       | uuid   | Fetch a single affiliate by ID       |
| `username` | string | Fetch a single affiliate by username |
| `limit`    | number | Results per page (default: 100)      |
| `page`     | number | Page number (default: 1)             |

**Example — get by username:**

```bash
curl "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliates?username=demo"
```

**Response (single):**

```json
{
  "affiliate": {
    "id": "uuid",
    "username": "demo",
    "full_name": "Demo Affiliate",
    "email": "demo@example.com",
    "phone": "0557956020",
    "ussd_code": "*928*123#",
    "commission_rate": 17,
    "balance": 0,
    "momo_number": null,
    "momo_name": null,
    "source_hook": "webhook_transactions_user_1",
    "created_at": "2026-07-06T16:46:19Z",
    "updated_at": "2026-07-06T16:46:19Z"
  }
}
```

> `password_hash` is never returned by this endpoint.

### PATCH — Update an affiliate

```bash
curl -X PATCH \
  "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliates" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "affiliate-uuid",
    "balance": 1500.00,
    "commission_rate": 20
  }'
```

**Updatable fields:**

| Field             | Type   | Description                          |
|-------------------|--------|--------------------------------------|
| `username`        | string | Login username (unique)              |
| `full_name`       | string | Full name                             |
| `email`           | string | Email address                         |
| `phone`           | string | Phone number                          |
| `ussd_code`       | string | Assigned USSD shortcode              |
| `commission_rate` | number | Commission percentage (default: 17)  |
| `balance`         | number | Account balance in GHS               |
| `momo_number`     | string | Mobile money number                   |
| `momo_name`       | string | Name on momo account                  |
| `source_hook`     | string | Webhook transactions table reference  |

**Response:**

```json
{
  "affiliate": {
    "id": "uuid",
    "username": "demo",
    "full_name": "Demo Affiliate",
    "commission_rate": 20,
    "balance": 1500.00,
    "updated_at": "2026-07-07T12:30:00Z"
  }
}
```

---

## JavaScript / TypeScript Examples

### Fetch all pending withdrawals

```typescript
const res = await fetch(
  "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliate-withdrawals?status=pending"
);
const { withdrawals, total } = await res.json();
console.log(`${total} pending withdrawals`, withdrawals);
```

### Mark a withdrawal as paid

```typescript
const res = await fetch(
  "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliate-withdrawals",
  {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "withdrawal-uuid",
      status: "paid",
    }),
  }
);
const { withdrawal } = await res.json();
console.log("Updated:", withdrawal);
```

### Get a single affiliate by username

```typescript
const res = await fetch(
  "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliates?username=demo"
);
const { affiliate } = await res.json();
console.log(affiliate);
```

### Update an affiliate's balance and commission

```typescript
const res = await fetch(
  "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliates",
  {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "affiliate-uuid",
      balance: 2500,
      commission_rate: 20,
    }),
  }
);
const { affiliate } = await res.json();
console.log(affiliate);
```

---

## Error Responses

| Status | Meaning                          |
|--------|----------------------------------|
| 400    | Missing `id` or no valid fields  |
| 404    | Record not found                 |
| 405    | Method not allowed               |
| 500    | Server error (see `error` field) |

```json
{ "error": "Withdrawal not found" }
```
