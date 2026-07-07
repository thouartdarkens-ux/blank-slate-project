/*
# Add source-code storage columns to nalo_endpoint_pairs

## Purpose
Store the generated (substituted) edge-function source code alongside
each cloned endpoint pair, so the functions can be deployed from the
stored source. The register edge function generates the source from
templates and stores it here; deployment is performed separately.

## Modified Tables
1. `nalo_endpoint_pairs`
   - ADD ussd_source (text, nullable) — generated USSD function source
   - ADD webhook_source (text, nullable) — generated webhook function source
   - ADD deployment_status (text, default 'pending') — pending | deployed | failed

## Notes
1. These columns are nullable so existing template/seed rows don't need source.
2. The register function writes the substituted source here; an admin or
   automation step then deploys from the stored source.
*/

ALTER TABLE public.nalo_endpoint_pairs
  ADD COLUMN IF NOT EXISTS ussd_source text,
  ADD COLUMN IF NOT EXISTS webhook_source text,
  ADD COLUMN IF NOT EXISTS deployment_status text NOT NULL DEFAULT 'pending';
