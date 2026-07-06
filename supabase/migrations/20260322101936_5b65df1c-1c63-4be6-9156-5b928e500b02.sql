CREATE TABLE public.bundle_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL,
  capacity text NOT NULL,
  mb text NOT NULL,
  cost_price numeric NOT NULL,
  selling_price numeric NOT NULL DEFAULT 0,
  in_stock boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(network, capacity)
);

ALTER TABLE public.bundle_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bundle prices are publicly readable" ON public.bundle_prices FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert bundle prices" ON public.bundle_prices FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update bundle prices" ON public.bundle_prices FOR UPDATE TO public USING (true);

CREATE TRIGGER update_bundle_prices_updated_at
  BEFORE UPDATE ON public.bundle_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();