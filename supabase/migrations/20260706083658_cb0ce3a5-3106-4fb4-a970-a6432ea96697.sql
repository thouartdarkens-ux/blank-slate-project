CREATE TABLE public.webhook_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT,
  phone_number TEXT,
  product TEXT,
  quantity INTEGER,
  amount NUMERIC,
  status TEXT,
  full_name TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.webhook_transactions TO service_role;

ALTER TABLE public.webhook_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_webhook_transactions_created_at ON public.webhook_transactions(created_at);
CREATE INDEX idx_webhook_transactions_status_product ON public.webhook_transactions(status, product);

CREATE TRIGGER update_webhook_transactions_updated_at
BEFORE UPDATE ON public.webhook_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();