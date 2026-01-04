-- إضافة الفهارس المفقودة لتحسين أداء الاستعلامات
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products(in_stock) WHERE in_stock = true;

-- إنشاء function لتحديث المخزون بشكل atomic (batch update)
CREATE OR REPLACE FUNCTION public.batch_update_stock(
  product_updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  product_id_val uuid;
  quantity_val integer;
  current_stock integer;
  new_stock integer;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(product_updates)
  LOOP
    product_id_val := (item->>'product_id')::uuid;
    quantity_val := (item->>'quantity')::integer;
    
    -- Get current stock with lock
    SELECT stock_count INTO current_stock
    FROM products
    WHERE id = product_id_val
    FOR UPDATE;
    
    IF current_stock IS NOT NULL THEN
      new_stock := GREATEST(0, current_stock - quantity_val);
      
      UPDATE products
      SET 
        stock_count = new_stock,
        in_stock = (new_stock > 0),
        updated_at = now()
      WHERE id = product_id_val;
    END IF;
  END LOOP;
END;
$$;

-- إنشاء function لتنظيف البيانات القديمة تلقائياً (scheduled cleanup)
CREATE OR REPLACE FUNCTION public.auto_cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- تنظيف محاولات الكوبون القديمة (أكثر من ساعة)
  DELETE FROM coupon_attempts 
  WHERE created_at < now() - interval '1 hour';
  
  -- يمكن إضافة المزيد من عمليات التنظيف هنا
END;
$$;