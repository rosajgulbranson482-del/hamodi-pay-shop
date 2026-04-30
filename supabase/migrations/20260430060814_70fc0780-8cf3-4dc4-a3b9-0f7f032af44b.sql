
-- Restore public visibility of active coupons (this is a deliberate UX feature for PromoBanner & CouponSuggestion).
-- Server-side validate-coupon edge function still enforces all redemption rules.
CREATE POLICY "Anyone can view active coupons"
ON public.coupons
FOR SELECT
USING (is_active = true);
