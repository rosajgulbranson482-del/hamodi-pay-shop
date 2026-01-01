-- Add customer_email column to orders table
ALTER TABLE public.orders 
ADD COLUMN customer_email text;

-- Add a comment for documentation
COMMENT ON COLUMN public.orders.customer_email IS 'Customer email for order notifications';