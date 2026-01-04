-- Fix profiles table RLS - ensure only authenticated users can view their own profile
-- First drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create secure SELECT policy for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Add policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix orders table - add explicit deny for unauthenticated users
-- The existing policies already check auth.uid() IS NOT NULL, but let's make sure

-- Drop and recreate policies to be more explicit
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

-- Recreate with explicit auth checks
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));