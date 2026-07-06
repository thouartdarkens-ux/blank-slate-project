
CREATE TABLE public.webhook_transactions_user_1 (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference text,
  phone_number text,
  product text,
  quantity integer,
  amount numeric,
  status text,
  full_name text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.webhook_transactions_user_1 TO service_role;
ALTER TABLE public.webhook_transactions_user_1 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role manages user_1 webhook txns"
  ON public.webhook_transactions_user_1 FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE TRIGGER update_webhook_transactions_user_1_updated_at
  BEFORE UPDATE ON public.webhook_transactions_user_1
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.webhook_transactions_user_2 (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference text,
  phone_number text,
  product text,
  quantity integer,
  amount numeric,
  status text,
  full_name text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.webhook_transactions_user_2 TO service_role;
ALTER TABLE public.webhook_transactions_user_2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role manages user_2 webhook txns"
  ON public.webhook_transactions_user_2 FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE TRIGGER update_webhook_transactions_user_2_updated_at
  BEFORE UPDATE ON public.webhook_transactions_user_2
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
