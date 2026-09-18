-- Restrict EXECUTE on internal/diagnostic SECURITY DEFINER functions to service_role only.
REVOKE EXECUTE ON FUNCTION public._phase3_2_run_tests() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_inspect_test_entitlements(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_test_get_membership_offer_at(timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_test_reset_user_lifecycle(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_unpaid_accounts(integer) FROM PUBLIC, anon, authenticated;