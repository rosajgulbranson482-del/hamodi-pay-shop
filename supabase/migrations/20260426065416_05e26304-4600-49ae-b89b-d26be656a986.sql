-- Create customer_addresses table for multiple saved addresses per user
CREATE TABLE public.customer_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'العنوان',
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  governorate TEXT NOT NULL,
  area TEXT,
  address TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX idx_customer_addresses_user ON public.customer_addresses(user_id);

-- Ensure only one default per user
CREATE UNIQUE INDEX idx_customer_addresses_one_default
  ON public.customer_addresses(user_id)
  WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- Owners can fully manage their own addresses
CREATE POLICY "Users can view their own addresses"
ON public.customer_addresses FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses"
ON public.customer_addresses FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
ON public.customer_addresses FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
ON public.customer_addresses FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Admins can view all (for support/order verification)
CREATE POLICY "Admins can view all addresses"
ON public.customer_addresses FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER update_customer_addresses_updated_at
BEFORE UPDATE ON public.customer_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add address snapshot column to orders (preserves the address used at order time)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS address_id UUID,
ADD COLUMN IF NOT EXISTS address_snapshot JSONB;