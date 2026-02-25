
-- Fix 1: stock_notifications - remove guest SELECT access to prevent data leak
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.stock_notifications;

CREATE POLICY "Users can view their own notifications"
ON public.stock_notifications
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Fix 2: orders - secure guest orders from unauthorized access
-- Drop existing policies that may allow broad access
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Guests can view orders" ON public.orders;

-- Authenticated users can view their own orders
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
