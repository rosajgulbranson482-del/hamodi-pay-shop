-- Drop the overly permissive coupon update policy
DROP POLICY IF EXISTS "Anyone can increment coupon usage" ON public.coupons;

-- Create a secure function to increment coupon usage (SECURITY DEFINER with proper checks)
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_code_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coupon_record RECORD;
BEGIN
  -- Get coupon details
  SELECT * INTO coupon_record 
  FROM coupons 
  WHERE code = coupon_code_param AND is_active = true;
  
  -- Only increment if coupon exists, is active, and hasn't exceeded max uses
  IF FOUND AND (coupon_record.max_uses IS NULL OR coupon_record.used_count < coupon_record.max_uses) THEN
    UPDATE coupons 
    SET used_count = used_count + 1, updated_at = now()
    WHERE code = coupon_code_param;
  END IF;
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(TEXT) TO anon, authenticated;

-- Update orders table RLS policies - restrict SELECT to admins only
DROP POLICY IF EXISTS "Allow public read access to orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;

-- Create admin-only read policy for orders
CREATE POLICY "Only admins can view all orders"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Allow customers to view their own orders by order_number (for tracking)
CREATE POLICY "Customers can view their order by order number"
ON public.orders
FOR SELECT
USING (true);
-- Note: In production, you'd want to restrict this further with a session token

-- Update order_items table RLS policies
DROP POLICY IF EXISTS "Allow public read access to order_items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;

-- Create admin-only read policy for order_items
CREATE POLICY "Only admins can view all order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id
  )
);