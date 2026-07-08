-- Add a trigger to uppercase source_hook on affiliates and webhook_transactions
-- This is a safety net so that no matter what the application sends, the stored value is always uppercase.

CREATE OR REPLACE FUNCTION public.uppercase_source_hook()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source_hook IS NOT NULL THEN
    NEW.source_hook := UPPER(NEW.source_hook);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_uppercase_source_hook_affiliates ON public.affiliates;
CREATE TRIGGER trg_uppercase_source_hook_affiliates
  BEFORE INSERT OR UPDATE OF source_hook ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION public.uppercase_source_hook();

DROP TRIGGER IF EXISTS trg_uppercase_source_hook_webhook_transactions ON public.webhook_transactions;
CREATE TRIGGER trg_uppercase_source_hook_webhook_transactions
  BEFORE INSERT OR UPDATE OF source_hook ON public.webhook_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.uppercase_source_hook();
