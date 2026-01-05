-- Add RLS policy for coupon_attempts table - only admins can view
CREATE POLICY "Admins can view coupon attempts" 
ON public.coupon_attempts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add policy for edge functions to insert (using service role)
CREATE POLICY "Service role can insert coupon attempts" 
ON public.coupon_attempts 
FOR INSERT 
WITH CHECK (true);

-- Add policy for admins to delete old attempts
CREATE POLICY "Admins can delete coupon attempts" 
ON public.coupon_attempts 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));