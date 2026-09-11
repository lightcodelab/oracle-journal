-- Security: members could previously grant themselves paid membership by updating
-- billing columns on their own profile row. Those columns are now preserved on any
-- update made by a signed-in non-admin; Stripe webhooks (service role) and admins
-- keep full control.
CREATE OR REPLACE FUNCTION public.profiles_guard_membership_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.member_tier_code := OLD.member_tier_code;
  NEW.plan_cadence := OLD.plan_cadence;
  NEW.subscription_status := OLD.subscription_status;
  NEW.current_period_end := OLD.current_period_end;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.is_active_member := OLD.is_active_member;
  NEW.active_member_since := OLD.active_member_since;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_membership_columns_trg ON public.profiles;
CREATE TRIGGER profiles_guard_membership_columns_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_membership_columns();
