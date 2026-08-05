CREATE TABLE public.aggregator_prefixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text NOT NULL UNIQUE,
  title text NOT NULL,
  charge_percentage numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed with discovered prefixes
INSERT INTO public.aggregator_prefixes (prefix, title, charge_percentage) VALUES
  ('CUD', 'CUD', 0),
  ('Admin', 'Admin', 0),
  ('Others', 'Others (No Prefix)', 0)
ON CONFLICT (prefix) DO NOTHING;