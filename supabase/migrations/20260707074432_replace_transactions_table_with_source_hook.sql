/*
# Replace affiliates.transactions_table with source_hook

## Purpose
Stop routing per-affiliate transaction lookups through dedicated table names
(webhook_transactions_user_1, _user_2, …) and instead store a single shared
table (webhook_transactions) with a `source_hook` column that tags each row
with the webhook/affiliate it belongs to. The affiliates table now holds a
`source_hook` text value that is used as a filter when fetching that
affiliate's transactions.

## Changes to existing tables
1. `affiliates`
   - ADD column `source_hook` (text, nullable). This stores the tag used to
     filter rows in `webhook_transactions`.
   - Backfill `source_hook` from the legacy `transactions_table` value so
     existing affiliates keep working: every row that had
     `transactions_table = 'webhook_transactions_user_1'` gets
     `source_hook = 'webhook_transactions_user_1'`, etc. Rows whose
     transactions_table was the shared `webhook_transactions` table get
     source_hook = 'webhook_transactions'.
   - DROP column `transactions_table` (no longer needed). This is safe
     because the data is migrated into source_hook first.

## Security
- No RLS policy changes. affiliates remains service_role-only (existing
  policies still apply).
- webhook_transactions already has a source_hook column (added previously)
  and its existing service_role-only RLS policy is unchanged.

## Important notes
1. The backfill runs BEFORE the column drop, so no data is lost.
2. After this migration, all transaction reads go through the single
   `webhook_transactions` table filtered by `source_hook`, instead of
   dynamic per-affiliate table names.
3. The demo affiliate is updated to source_hook = 'demo' so demo data is
   easy to identify and verify.
*/

-- 1. Add source_hook column if it does not exist
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS source_hook text;

-- 2. Backfill source_hook from the legacy transactions_table value
UPDATE public.affiliates
SET source_hook = COALESCE(transactions_table, 'webhook_transactions')
WHERE source_hook IS NULL;

-- 3. Set the demo affiliate's source_hook to 'demo' for easy verification
UPDATE public.affiliates
SET source_hook = 'demo'
WHERE username = 'demo';

-- 4. Make source_hook NOT NULL now that every row has a value
UPDATE public.affiliates
SET source_hook = 'webhook_transactions'
WHERE source_hook IS NULL;
ALTER TABLE public.affiliates
  ALTER COLUMN source_hook SET NOT NULL;

-- 5. Drop the legacy transactions_table column
ALTER TABLE public.affiliates
  DROP COLUMN IF EXISTS transactions_table;
