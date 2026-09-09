-- Security: an affiliate could previously update their own row's status and
-- commission rates (self-approval / self-set payout rates). Privileged columns
-- are now preserved on any non-admin update, so members keep editing their own
-- profile and payout details while approval and rates stay admin-only.
CREATE OR REPLACE FUNCTION public.affiliates_guard_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.status := OLD.status;
  NEW.commission_signup_pct := OLD.commission_signup_pct;
  NEW.commission_recurring_pct := OLD.commission_recurring_pct;
  NEW.approved_at := OLD.approved_at;
  NEW.notes := OLD.notes;
  NEW.user_id := OLD.user_id;
  NEW.referral_code := OLD.referral_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS affiliates_guard_privileged_columns_trg ON public.affiliates;
CREATE TRIGGER affiliates_guard_privileged_columns_trg
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.affiliates_guard_privileged_columns();
