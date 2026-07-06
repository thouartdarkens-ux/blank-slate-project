CREATE TABLE public.data_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  network text NOT NULL,
  capacity text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  purchase_id text,
  order_reference text,
  transaction_reference text,
  balance_before numeric,
  balance_after numeric,
  processing_method text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.data_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read data transactions" ON public.data_transactions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert data transactions" ON public.data_transactions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update data transactions" ON public.data_transactions FOR UPDATE TO public USING (true);

CREATE TRIGGER update_data_transactions_updated_at
  BEFORE UPDATE ON public.data_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();