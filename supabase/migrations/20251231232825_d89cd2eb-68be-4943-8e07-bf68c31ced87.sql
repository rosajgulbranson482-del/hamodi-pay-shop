-- Create a policy to allow anyone to increment coupon usage count
CREATE POLICY "Anyone can increment coupon usage"
ON public.coupons
FOR UPDATE
USING (true)
WITH CHECK (true);