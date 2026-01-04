-- Create delivery settings table
CREATE TABLE public.delivery_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_fee numeric NOT NULL DEFAULT 50,
  delivery_days text NOT NULL DEFAULT '1-3 أيام',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view delivery settings
CREATE POLICY "Anyone can view delivery settings" 
ON public.delivery_settings 
FOR SELECT 
USING (true);

-- Only admins can update delivery settings
CREATE POLICY "Admins can update delivery settings" 
ON public.delivery_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert delivery settings
CREATE POLICY "Admins can insert delivery settings" 
ON public.delivery_settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.delivery_settings (delivery_fee, delivery_days) 
VALUES (50, '1-3 أيام');

-- Create trigger for updated_at
CREATE TRIGGER update_delivery_settings_updated_at
BEFORE UPDATE ON public.delivery_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();