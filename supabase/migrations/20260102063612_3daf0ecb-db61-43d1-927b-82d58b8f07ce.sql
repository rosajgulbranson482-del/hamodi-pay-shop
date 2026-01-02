-- Create governorates table
CREATE TABLE public.governorates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    delivery_fee numeric NOT NULL DEFAULT 50,
    delivery_days text NOT NULL DEFAULT '2-3 أيام',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;

-- Anyone can view active governorates
CREATE POLICY "Anyone can view active governorates" 
ON public.governorates 
FOR SELECT 
USING (is_active = true);

-- Admins can view all governorates
CREATE POLICY "Admins can view all governorates" 
ON public.governorates 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert governorates
CREATE POLICY "Admins can insert governorates" 
ON public.governorates 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update governorates
CREATE POLICY "Admins can update governorates" 
ON public.governorates 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete governorates
CREATE POLICY "Admins can delete governorates" 
ON public.governorates 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_governorates_updated_at
BEFORE UPDATE ON public.governorates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default governorates data
INSERT INTO public.governorates (name, delivery_fee, delivery_days) VALUES
('القاهرة', 40, '1-2 يوم'),
('الجيزة', 40, '1-2 يوم'),
('الإسكندرية', 50, '2-3 أيام'),
('القليوبية', 45, '2-3 أيام'),
('الشرقية', 50, '2-3 أيام'),
('الدقهلية', 50, '2-3 أيام'),
('البحيرة', 55, '3-4 أيام'),
('الغربية', 50, '2-3 أيام'),
('المنوفية', 50, '2-3 أيام'),
('كفر الشيخ', 55, '3-4 أيام'),
('دمياط', 55, '3-4 أيام'),
('بورسعيد', 55, '3-4 أيام'),
('الإسماعيلية', 55, '3-4 أيام'),
('السويس', 55, '3-4 أيام'),
('الفيوم', 55, '3-4 أيام'),
('بني سويف', 60, '3-4 أيام'),
('المنيا', 65, '4-5 أيام'),
('أسيوط', 70, '4-5 أيام'),
('سوهاج', 70, '4-5 أيام'),
('قنا', 75, '5-6 أيام'),
('الأقصر', 75, '5-6 أيام'),
('أسوان', 80, '5-7 أيام'),
('البحر الأحمر', 85, '5-7 أيام'),
('شمال سيناء', 90, '6-8 أيام'),
('جنوب سيناء', 90, '6-8 أيام'),
('مطروح', 85, '5-7 أيام'),
('الوادي الجديد', 100, '7-10 أيام');