-- Add lifetime_commissions, sales_quantity, sales_amount columns to affiliates
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS lifetime_commissions numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_amount numeric NOT NULL DEFAULT 0;
