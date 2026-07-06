CREATE TABLE public.nalo_ussd_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  userid text NOT NULL,
  msisdn text NOT NULL,
  network text,
  stage text NOT NULL DEFAULT 'MENU',
  session_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nalo_ussd_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow edge functions full access"
  ON public.nalo_ussd_sessions FOR ALL
  USING (true) WITH CHECK (true);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.nalo_ussd_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();