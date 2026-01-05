-- إنشاء جدول مراكز الشرقية مع سعر التوصيل
CREATE TABLE public.sharqia_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  delivery_fee NUMERIC NOT NULL DEFAULT 50,
  delivery_days TEXT NOT NULL DEFAULT '1-3 أيام',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.sharqia_centers ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول
CREATE POLICY "Anyone can view active centers" 
ON public.sharqia_centers 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can view all centers" 
ON public.sharqia_centers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert centers" 
ON public.sharqia_centers 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update centers" 
ON public.sharqia_centers 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete centers" 
ON public.sharqia_centers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger لتحديث updated_at
CREATE TRIGGER update_sharqia_centers_updated_at
BEFORE UPDATE ON public.sharqia_centers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- إدخال المراكز الموجودة
INSERT INTO public.sharqia_centers (name, delivery_fee) VALUES
  ('الزقازيق', 50),
  ('بلبيس', 50),
  ('منيا القمح', 50),
  ('أبو حماد', 50),
  ('أبو كبير', 50),
  ('فاقوس', 50),
  ('الحسينية', 50),
  ('ههيا', 50),
  ('كفر صقر', 50),
  ('أولاد صقر', 50),
  ('الإبراهيمية', 50),
  ('ديرب نجم', 50),
  ('القرين', 50),
  ('مشتول السوق', 50),
  ('القنايات', 50),
  ('العاشر من رمضان', 50),
  ('صان الحجر', 50);