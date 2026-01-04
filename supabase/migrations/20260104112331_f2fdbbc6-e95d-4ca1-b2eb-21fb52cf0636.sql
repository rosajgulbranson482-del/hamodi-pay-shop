-- Create table for stock notifications
CREATE TABLE public.stock_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for guest users)
CREATE POLICY "Anyone can request stock notification"
ON public.stock_notifications
FOR INSERT
WITH CHECK (true);

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.stock_notifications
FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.stock_notifications
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_stock_notifications_product_id ON public.stock_notifications(product_id);
CREATE INDEX idx_stock_notifications_notified ON public.stock_notifications(notified) WHERE notified = false;