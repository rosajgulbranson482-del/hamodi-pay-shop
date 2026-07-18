
-- Lock down SECURITY DEFINER functions: revoke unnecessary EXECUTE grants
-- Trigger-only functions should never be directly callable by API roles
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies. Revoke from anon/PUBLIC; keep authenticated
-- (RLS policies invoke it as the querying role, so authenticated must retain EXECUTE).
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
