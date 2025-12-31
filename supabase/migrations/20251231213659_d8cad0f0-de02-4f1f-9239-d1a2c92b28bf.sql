-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can view active coupons (for validation)
CREATE POLICY "Anyone can view active coupons"
ON public.coupons FOR SELECT
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can insert coupons"
ON public.coupons FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update coupons"
ON public.coupons FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete coupons"
ON public.coupons FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all coupons (including inactive)
CREATE POLICY "Admins can view all coupons"
ON public.coupons FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add coupon_code and discount columns to orders table
ALTER TABLE public.orders 
ADD COLUMN coupon_code TEXT DEFAULT NULL,
ADD COLUMN discount_amount NUMERIC DEFAULT 0;

-- Create trigger for updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();