ALTER TABLE public.voucher_types ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;
ALTER TABLE public.voucher_types ADD COLUMN IF NOT EXISTS aggregator_charge numeric DEFAULT 0;