/*
# Create payout_transactions table

## Purpose
Records every Moolre payout transaction (money out to affiliates) and
balance checks (money in status). This is the audit log for the payout system.

## Columns
- id: UUID primary key
- withdrawal_id: FK to affiliate_withdrawals (nullable, since balance checks
  don't have a withdrawal)
- affiliate_id: FK to affiliates
- type: 'balance_check' | 'validation' | 'transfer' | 'refund'
- recipient_number: the phone number being paid
- recipient_name: the name returned by validation
- amount: the transaction amount (0 for balance checks)
- network: the mobile money network code (13=MTN, 6=Telecel, 7=AT)
- external_ref: the unique reference sent to Moolre
- status: 'success' | 'failed' | 'pending'
- response_code: raw response code from Moolre
- response_message: raw response message from Moolre
- raw_response: full JSON response from Moolre
- created_at: timestamp
*/

CREATE TABLE IF NOT EXISTS public.payout_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id UUID REFERENCES public.affiliate_withdrawals(id) ON DELETE SET NULL,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'transfer',
  recipient_number TEXT,
  recipient_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  network TEXT,
  external_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  response_code TEXT,
  response_message TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payout_transactions_affiliate_id
  ON public.payout_transactions (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_withdrawal_id
  ON public.payout_transactions (withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_status
  ON public.payout_transactions (status);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_created_at
  ON public.payout_transactions (created_at DESC);

ALTER TABLE public.payout_transactions ENABLE ROW LEVEL SECURITY;

-- No-auth app: service role bypasses RLS, anon/authenticated clients read their own data
CREATE POLICY "select_own_payout_transactions" ON public.payout_transactions
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_own_payout_transactions" ON public.payout_transactions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_own_payout_transactions" ON public.payout_transactions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_payout_transactions" ON public.payout_transactions
  FOR DELETE TO anon, authenticated USING (true);
