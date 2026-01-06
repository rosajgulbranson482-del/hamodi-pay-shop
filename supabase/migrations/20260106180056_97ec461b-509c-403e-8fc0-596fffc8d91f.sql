-- Create delivery_areas table for areas within governorates
CREATE TABLE public.delivery_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  governorate_id UUID NOT NULL REFERENCES public.governorates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  delivery_days TEXT NOT NULL DEFAULT '2-3 أيام',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active delivery areas" 
ON public.delivery_areas 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage delivery areas" 
ON public.delivery_areas 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_delivery_areas_updated_at
BEFORE UPDATE ON public.delivery_areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add more governorates
INSERT INTO public.governorates (name, delivery_fee, delivery_days, is_active) VALUES
('القاهرة', 50, '1-2 أيام', true),
('الجيزة', 50, '1-2 أيام', true),
('الإسكندرية', 60, '2-3 أيام', true),
('الدقهلية', 55, '2-3 أيام', true),
('البحيرة', 55, '2-3 أيام', true),
('الغربية', 55, '2-3 أيام', true),
('المنوفية', 55, '2-3 أيام', true),
('القليوبية', 50, '1-2 أيام', true),
('كفر الشيخ', 60, '2-3 أيام', true),
('دمياط', 55, '2-3 أيام', true),
('بورسعيد', 60, '2-3 أيام', true),
('الإسماعيلية', 55, '2-3 أيام', true),
('السويس', 60, '2-3 أيام', true),
('شمال سيناء', 80, '4-5 أيام', true),
('جنوب سيناء', 80, '4-5 أيام', true),
('الفيوم', 60, '2-3 أيام', true),
('بني سويف', 60, '2-3 أيام', true),
('المنيا', 65, '3-4 أيام', true),
('أسيوط', 70, '3-4 أيام', true),
('سوهاج', 70, '3-4 أيام', true),
('قنا', 75, '3-4 أيام', true),
('الأقصر', 75, '3-4 أيام', true),
('أسوان', 80, '4-5 أيام', true),
('البحر الأحمر', 80, '4-5 أيام', true),
('الوادي الجديد', 90, '5-6 أيام', true),
('مطروح', 80, '4-5 أيام', true)
ON CONFLICT DO NOTHING;

-- Migrate existing sharqia_centers to delivery_areas
INSERT INTO public.delivery_areas (governorate_id, name, delivery_fee, delivery_days, is_active)
SELECT 
  (SELECT id FROM public.governorates WHERE name = 'الشرقية' LIMIT 1),
  sc.name,
  sc.delivery_fee,
  sc.delivery_days,
  sc.is_active
FROM public.sharqia_centers sc
WHERE EXISTS (SELECT 1 FROM public.governorates WHERE name = 'الشرقية');