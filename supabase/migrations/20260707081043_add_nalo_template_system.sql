/*
# Add Nalo endpoint-pair templating system

## Purpose
Introduce a templating system so that when a new affiliate registers, the
system can clone the base Nalo USSD + webhook functions with per-affiliate
substitutions (notification phone number, source_hook filter, callback URL)
and insert the resulting pair into `nalo_endpoint_pairs`.

## New Tables
1. `nalo_templates`
   - id (uuid PK)
   - name (text, unique) — "naloussd" or "nalowebhook"
   - template_source (text) — the full edge-function source with
     placeholders: {{SOURCE_HOOK}}, {{NOTIFICATION_PHONE}}, {{CALLBACK_FUNCTION}}
   - description (text)
   - created_at, updated_at (timestamptz)

## Modified Tables
1. `nalo_endpoint_pairs`
   - ADD affiliate_id (uuid, nullable, FK → affiliates ON DELETE SET NULL)
     so each cloned pair links back to the affiliate it was created for.
   - ADD source_hook (text, nullable) — the source_hook value used by the
     webhook clone (also stored on affiliates.source_hook).
   - ADD notification_phone (text, nullable) — the phone number that
     transaction-alert SMS messages are sent to for this pair.
   - ADD is_template (boolean, default false) — marks template/seed rows
     vs. cloned affiliate rows.
   - ADD affiliate_name (text, nullable) — the full name of the affiliate
     the pair was cloned for (denormalized for easy admin display).

## Security
- RLS enabled on `nalo_templates`, service_role-only policy (mirrors
  nalo_endpoint_pairs). The templates are never exposed to the anon client.
- nalo_endpoint_pairs existing service_role-only policy is unchanged.

## Notes
1. Template source content is seeded by the registration edge function
   on first run (it reads the template files from the function bundle and
   upserts them into nalo_templates). This migration only creates the
   schema.
2. Existing rows in nalo_endpoint_pairs (if any) get is_template = false
   by default, which is correct — they are real pairs, not templates.
*/

CREATE TABLE IF NOT EXISTS public.nalo_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  template_source text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nalo_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nalo_templates_service_role_all" ON public.nalo_templates;
CREATE POLICY "nalo_templates_service_role_all" ON public.nalo_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_nalo_templates_updated_at ON public.nalo_templates;
CREATE TRIGGER update_nalo_templates_updated_at
  BEFORE UPDATE ON public.nalo_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.nalo_endpoint_pairs
  ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_hook text,
  ADD COLUMN IF NOT EXISTS notification_phone text,
  ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS affiliate_name text;
