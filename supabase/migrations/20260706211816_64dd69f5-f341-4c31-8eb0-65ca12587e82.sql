CREATE TABLE public.nalo_endpoint_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  network text,
  ussd_function_name text NOT NULL,
  ussd_function_url text NOT NULL,
  webhook_function_name text NOT NULL,
  webhook_function_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

GRANT ALL ON public.nalo_endpoint_pairs TO service_role;

ALTER TABLE public.nalo_endpoint_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages nalo endpoint pairs"
ON public.nalo_endpoint_pairs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_nalo_endpoint_pairs_updated_at
BEFORE UPDATE ON public.nalo_endpoint_pairs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();