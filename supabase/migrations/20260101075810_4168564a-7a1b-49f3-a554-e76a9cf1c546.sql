-- Remove public access policy for coupons and restrict to admins only
DROP POLICY IF EXISTS "Anyone can validate active coupons" ON public.coupons;

-- Only admins can view coupons (validation is now done through secure edge function)
-- Keep the admin policy as is