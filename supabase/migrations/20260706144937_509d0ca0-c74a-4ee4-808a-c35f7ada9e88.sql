
CREATE TABLE public.affiliates (
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
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.affiliates FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_affiliates_updated_at
BEFORE UPDATE ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.affiliate_withdrawals (
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
GRANT ALL ON public.affiliate_withdrawals TO service_role;
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.affiliate_withdrawals FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_affiliate_withdrawals_updated_at
BEFORE UPDATE ON public.affiliate_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.affiliates (username, password_hash, full_name, email, phone, ussd_code, commission_rate, transactions_table)
VALUES (
  'demo',
  'f35451d976999cd380cb8c45ee98e8c7ae1c9262b7d0713dcb54f7655bca1ce7',
  'Demo Affiliate',
  'demo@example.com',
  '0557956020',
  '*928*123#',
  17,
  'webhook_transactions_user_1'
);
