
-- 1. Restrict coupons SELECT: Only admins can view coupons table directly.
--    Public coupon validation is performed via the validate-coupon edge function (service role).
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

-- 2. Restrict backend_logs INSERT to service_role only (not public/anon/authenticated).
DROP POLICY IF EXISTS "Service role can insert logs" ON public.backend_logs;
CREATE POLICY "Service role can insert logs"
ON public.backend_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3. Restrict coupon_attempts INSERT to service_role only.
DROP POLICY IF EXISTS "Service role can insert coupon attempts" ON public.coupon_attempts;
CREATE POLICY "Service role can insert coupon attempts"
ON public.coupon_attempts
FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. Tighten function execute privileges (least privilege / defense-in-depth).
REVOKE EXECUTE ON FUNCTION public.batch_update_stock(jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.batch_update_stock(jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.auto_cleanup_old_data() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.auto_cleanup_old_data() TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_coupon_attempts() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_old_coupon_attempts() TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_page_views() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_old_page_views() TO service_role;

-- increment_coupon_usage is also only called from edge functions
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_coupon_usage(text) TO service_role;
