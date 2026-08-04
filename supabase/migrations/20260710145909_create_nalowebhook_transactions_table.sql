/*
# Create nalowebhook_transactions table

1. New Tables
- `nalowebhook_transactions`
  - `id` (uuid, primary key)
  - `reference` (text, nullable) — payment reference from Nalo
  - `phone_number` (text, nullable) — customer phone
  - `product` (text, nullable) — product type (BECE, WASSCE, etc.)
  - `quantity` (integer, nullable) — number of vouchers
  - `amount` (numeric, nullable) — transaction amount
  - `status` (text, nullable) — transaction status (COMPLETED, FAILED, etc.)
  - `full_name` (text, nullable) — customer name
  - `raw_payload` (jsonb, nullable) — full webhook payload
  - `source_hook` (text, nullable) — source hook identifier
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- RLS enabled.
- Anon + authenticated CRUD (webhook writes via service role key, reads from dashboard).

3. Notes
- This table is specific to the nalowebhook endpoint and will store ALL transactions
  regardless of source_hook. The daily balance calculation will use this table without
  any source_hook filter.
*/

CREATE TABLE IF NOT EXISTS nalowebhook_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text,
  phone_number text,
  product text,
  quantity integer,
  amount numeric,
  status text,
  full_name text,
  raw_payload jsonb,
  source_hook text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nalowebhook_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_nalowebhook_transactions" ON nalowebhook_transactions;
CREATE POLICY "anon_select_nalowebhook_transactions"
ON nalowebhook_transactions FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_nalowebhook_transactions" ON nalowebhook_transactions;
CREATE POLICY "anon_insert_nalowebhook_transactions"
ON nalowebhook_transactions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_nalowebhook_transactions" ON nalowebhook_transactions;
CREATE POLICY "anon_update_nalowebhook_transactions"
ON nalowebhook_transactions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_nalowebhook_transactions" ON nalowebhook_transactions;
CREATE POLICY "anon_delete_nalowebhook_transactions"
ON nalowebhook_transactions FOR DELETE
TO anon, authenticated USING (true);

-- Index for dedup lookups
CREATE INDEX IF NOT EXISTS idx_nalowebhook_transactions_reference_status
ON nalowebhook_transactions (reference, status);
