-- Create table to track coupon validation attempts for rate limiting
CREATE TABLE public.coupon_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text NOT NULL,
  attempted_code text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupon_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow inserts from edge functions (service role)
-- No public access policies - only service role can access this table

-- Create index for faster lookups
CREATE INDEX idx_coupon_attempts_ip_created ON public.coupon_attempts (ip_address, created_at DESC);

-- Create function to clean old attempts (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_coupon_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.coupon_attempts 
  WHERE created_at < now() - interval '1 hour';
END;
$$;