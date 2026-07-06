
CREATE TABLE public.manual_processing_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_phone text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_processing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manual processing settings are publicly readable"
  ON public.manual_processing_settings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert manual processing settings"
  ON public.manual_processing_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update manual processing settings"
  ON public.manual_processing_settings FOR UPDATE
  USING (true);

-- Insert a default row
INSERT INTO public.manual_processing_settings (admin_phone, is_active)
VALUES ('', false);
