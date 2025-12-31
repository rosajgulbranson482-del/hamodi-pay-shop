-- Create product_images table for multiple images per product
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view product images
CREATE POLICY "Anyone can view product images"
ON public.product_images FOR SELECT
USING (true);

-- Admins can insert product images
CREATE POLICY "Admins can insert product images"
ON public.product_images FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update product images
CREATE POLICY "Admins can update product images"
ON public.product_images FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete product images
CREATE POLICY "Admins can delete product images"
ON public.product_images FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add index for faster queries
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);