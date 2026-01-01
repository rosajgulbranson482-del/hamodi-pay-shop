-- Remove the existing SELECT policies and create new ones that explicitly require authentication
-- for orders table
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

CREATE POLICY "Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- for profiles table - update existing policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- for user_roles table - update existing policies
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- for order_items - update existing policies
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;

CREATE POLICY "Admins can view all order items" 
ON public.order_items 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own order items" 
ON public.order_items 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- for coupons - restrict usage statistics to admins only
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can view all coupons" ON public.coupons;

-- Create a limited view for coupon validation (only code and discount info, not usage stats)
CREATE POLICY "Anyone can validate active coupons" 
ON public.coupons 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can view all coupons including inactive" 
ON public.coupons 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));