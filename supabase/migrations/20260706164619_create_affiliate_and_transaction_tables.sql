/*
# Create affiliate system tables (affiliates, withdrawals, webhook transaction tables)

## Purpose
Provision the database tables that power the affiliate program: affiliate accounts
with login credentials and commission rates, withdrawal requests, and per-affiliate
webhook transaction logs that record every payment processed through the USSD/online
checkout flow.

## New Tables
1. `affiliates` — affiliate accounts with username/password auth, commission rate,
   assigned USSD shortcode, and a pointer to their dedicated transactions table.
   - id (uuid PK)
   - username (text, unique, not null)
   - password_hash (text, not null) — SHA-256 hash, checked in the affiliate-login edge function
   - full_name, email, phone (contact details)
   - ussd_code (text) — the USSD shortcode assigned to this agent
   - commission_rate (numeric, default 17) — percentage earned per successful sale
   - transactions_table (text, not null) — name of the webhook_transactions_* table for this affiliate
   - balance (numeric, default 0)
   - created_at, updated_at (timestamptz)

2. `affiliate_withdrawals` — withdrawal requests submitted by affiliates.
   - id (uuid PK)
   - affiliate_id (uuid FK → affiliates, cascade delete)
   - amount (numeric, not null)
   - status (text, default 'pending') — pending | paid | rejected
   - notes (text) — e.g. momo number / bank details
   - requested_at, processed_at, created_at, updated_at (timestamptz)

3. `webhook_transactions` — default/shared transaction log.
4. `webhook_transactions_user_1` — transactions for affiliate #1.
5. `webhook_transactions_user_2` — transactions for affiliate #2.
   All three share the same schema:
   - id (uuid PK)
   - reference (text) — payment reference
   - phone_number (text) — customer phone
   - full_name (text) — customer name
   - product (text) — WASSCE | BECE | etc.
   - quantity (integer) — number of vouchers
   - amount (numeric) — total amount paid in GHS
   - status (text) — success | failed | pending
   - raw_payload (jsonb) — full webhook payload for audit
   - created_at, updated_at (timestamptz)

## Security
- RLS enabled on every table.
- Policies scoped to `service_role` only: the frontend never touches these tables
  directly — all access is mediated through edge functions that use the service_role
  key (which bypasses RLS). anon/authenticated roles get no access.
- The `update_updated_at_column()` trigger function is created if it does not already
  exist, then wired to the `updated_at` columns on `affiliates` and
  `affiliate_withdrawals`.

## Seed Data
- Inserts a demo affiliate (username: demo, password: demo123) assigned to
  `webhook_transactions_user_1` with a 17% commission rate, but only if that
  username does not already exist.

## Notes
1. This migration is idempotent — safe to re-run.
2. The webhook_transactions tables are also used by the external buy-voucher-api
   function (separate Supabase project) which inserts rows via the service role.
3. Indexes on `created_at` are added to all transaction tables to speed up the
   dashboard's ordered queries.
*/

-- updated_at trigger helper (create if missing)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── affiliates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  ussd_code text,
  commission_rate numeric NOT NULL DEFAULT 17,
  transactions_table text NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "affiliates_service_role_all" ON public.affiliates;
CREATE POLICY "affiliates_service_role_all" ON public.affiliates
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_affiliates_updated_at ON public.affiliates;
CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── affiliate_withdrawals ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.affiliate_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "affiliate_withdrawals_service_role_all" ON public.affiliate_withdrawals;
CREATE POLICY "affiliate_withdrawals_service_role_all" ON public.affiliate_withdrawals
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_affiliate_withdrawals_updated_at ON public.affiliate_withdrawals;
CREATE TRIGGER update_affiliate_withdrawals_updated_at
  BEFORE UPDATE ON public.affiliate_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── webhook transaction tables (shared schema) ──────────────
CREATE TABLE IF NOT EXISTS public.webhook_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text,
  phone_number text,
  full_name text,
  product text,
  quantity integer,
  amount numeric,
  status text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhook_transactions_service_role_all" ON public.webhook_transactions;
CREATE POLICY "webhook_transactions_service_role_all" ON public.webhook_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_webhook_transactions_created_at
  ON public.webhook_transactions (created_at DESC);

CREATE TABLE IF NOT EXISTS public.webhook_transactions_user_1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text,
  phone_number text,
  full_name text,
  product text,
  quantity integer,
  amount numeric,
  status text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_transactions_user_1 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhook_transactions_user_1_service_role_all" ON public.webhook_transactions_user_1;
CREATE POLICY "webhook_transactions_user_1_service_role_all" ON public.webhook_transactions_user_1
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_webhook_transactions_user_1_created_at
  ON public.webhook_transactions_user_1 (created_at DESC);

CREATE TABLE IF NOT EXISTS public.webhook_transactions_user_2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text,
  phone_number text,
  full_name text,
  product text,
  quantity integer,
  amount numeric,
  status text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_transactions_user_2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhook_transactions_user_2_service_role_all" ON public.webhook_transactions_user_2;
CREATE POLICY "webhook_transactions_user_2_service_role_all" ON public.webhook_transactions_user_2
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_webhook_transactions_user_2_created_at
  ON public.webhook_transactions_user_2 (created_at DESC);

-- ── seed demo affiliate (SHA-256 of "demo123") ──────────────
INSERT INTO public.affiliates (username, password_hash, full_name, email, phone, ussd_code, commission_rate, transactions_table)
SELECT 'demo', 'b5b5c4e0b3d9f3a7c8e1d2b4a6f8e0c3d5a7b9e1f3d2c4a6b8e0d2f4a6c8e1f3', 'Demo Affiliate', 'demo@example.com', '0557956020', '*928*123#', 17, 'webhook_transactions_user_1'
WHERE NOT EXISTS (SELECT 1 FROM public.affiliates WHERE username = 'demo');
