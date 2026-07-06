
CREATE TABLE public.balance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold numeric NOT NULL DEFAULT 50,
  phone_numbers text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_alert_sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.balance_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Balance alerts are publicly readable" ON public.balance_alerts FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert balance alerts" ON public.balance_alerts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update balance alerts" ON public.balance_alerts FOR UPDATE TO public USING (true);

CREATE TRIGGER update_balance_alerts_updated_at
  BEFORE UPDATE ON public.balance_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
