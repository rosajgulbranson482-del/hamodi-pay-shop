-- Drop the overly permissive public SELECT policies
DROP POLICY IF EXISTS "Users can view orders by order_number for tracking" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view order items for tracking" ON public.order_items;

-- Create a more restrictive policy for order_items that only allows viewing through owned orders
-- (The edge function will handle public tracking with limited data exposure)