/*
# Add unique constraints on affiliates

## Purpose
Prevent duplicate usernames, source_hooks, and emails among affiliates.

## Constraints
1. affiliates.username — UNIQUE (NOT NULL)
2. affiliates.source_hook — UNIQUE (NOT NULL)
3. affiliates.email — UNIQUE WHERE email IS NOT NULL (partial index,
   since email is nullable)

## Data cleanup
- Removed one duplicate affiliate (Ekua Tettevi, second registration) that
  shared source_hook = '352' with the original.
- Normalized empty-string emails to NULL so the partial unique index works.
*/

CREATE UNIQUE INDEX IF NOT EXISTS affiliates_username_unique
  ON public.affiliates (username);

CREATE UNIQUE INDEX IF NOT EXISTS affiliates_source_hook_unique
  ON public.affiliates (source_hook);

CREATE UNIQUE INDEX IF NOT EXISTS affiliates_email_unique
  ON public.affiliates (email)
  WHERE email IS NOT NULL;
