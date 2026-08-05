CREATE TABLE public.ussd_sessions (
  session_id text PRIMARY KEY,
  msisdn text NOT NULL,
  stage text NOT NULL DEFAULT 'MENU',
  session_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ussd_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to ussd_sessions" ON public.ussd_sessions
  FOR ALL USING (true) WITH CHECK (true);