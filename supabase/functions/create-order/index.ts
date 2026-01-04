import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}

interface CreateOrderRequest {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address: string;
  governorate: string;
  payment_method: string;
  notes?: string;
  coupon_code?: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  discount_amount?: number;
  total: number;
  user_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CreateOrderRequest = await req.json();
    
    // Validate required fields
    if (!body.customer_name?.trim()) {
      return new Response(
        JSON.stringify({ error: 'اسم العميل مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!body.customer_phone?.trim()) {
      return new Response(
        JSON.stringify({ error: 'رقم الهاتف مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!body.customer_address?.trim()) {
      return new Response(
        JSON.stringify({ error: 'العنوان مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!body.governorate?.trim()) {
      return new Response(
        JSON.stringify({ error: 'المحافظة مطلوبة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!body.payment_method?.trim()) {
      return new Response(
        JSON.stringify({ error: 'طريقة الدفع مطلوبة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!body.items || body.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'يجب إضافة منتج واحد على الأقل' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate numeric fields
    if (typeof body.subtotal !== 'number' || body.subtotal < 0) {
      return new Response(
        JSON.stringify({ error: 'المجموع الفرعي غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (typeof body.delivery_fee !== 'number' || body.delivery_fee < 0) {
      return new Response(
        JSON.stringify({ error: 'رسوم التوصيل غير صالحة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (typeof body.total !== 'number' || body.total < 0) {
      return new Response(
        JSON.stringify({ error: 'المجموع غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate items
    for (const item of body.items) {
      if (!item.product_name?.trim() || typeof item.product_price !== 'number' || typeof item.quantity !== 'number') {
        return new Response(
          JSON.stringify({ error: 'بيانات المنتجات غير صالحة' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate email format if provided
    if (body.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customer_email)) {
      return new Response(
        JSON.stringify({ error: 'البريد الإلكتروني غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating order for:', body.customer_name, 'Phone:', body.customer_phone, 'Email:', body.customer_email || 'N/A');

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check stock availability for all items
    const productIds = body.items.filter(item => item.product_id).map(item => item.product_id);
    
    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, stock_count, in_stock')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        return new Response(
          JSON.stringify({ error: 'حدث خطأ أثناء التحقق من المخزون' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate stock for each item
      for (const item of body.items) {
        if (!item.product_id) continue;
        
        const product = products?.find(p => p.id === item.product_id);
        
        if (!product) {
          return new Response(
            JSON.stringify({ error: `المنتج "${item.product_name}" غير موجود` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if product is in stock
        if (product.in_stock === false) {
          return new Response(
            JSON.stringify({ error: `المنتج "${item.product_name}" غير متوفر حالياً` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if stock_count is sufficient (if stock_count is tracked)
        if (product.stock_count !== null && product.stock_count < item.quantity) {
          if (product.stock_count === 0) {
            return new Response(
              JSON.stringify({ error: `المنتج "${item.product_name}" نفذ من المخزون` }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          return new Response(
            JSON.stringify({ error: `الكمية المطلوبة من "${item.product_name}" غير متوفرة. المتاح: ${product.stock_count} قطعة فقط` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Generate order number
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `HS-${dateStr}-${randomNum}`;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: body.customer_name.trim(),
        customer_phone: body.customer_phone.trim(),
        customer_email: body.customer_email?.trim() || null,
        customer_address: body.customer_address.trim(),
        governorate: body.governorate.trim(),
        payment_method: body.payment_method.trim(),
        notes: body.notes?.trim() || null,
        coupon_code: body.coupon_code?.trim() || null,
        subtotal: body.subtotal,
        delivery_fee: body.delivery_fee,
        discount_amount: body.discount_amount || 0,
        total: body.total,
        user_id: body.user_id || null,
        status: 'pending',
        payment_confirmed: false,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'حدث خطأ أثناء إنشاء الطلب' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order items
    const orderItems = body.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id || null,
      product_name: item.product_name.trim(),
      product_price: item.product_price,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback order
      await supabase.from('orders').delete().eq('id', order.id);
      return new Response(
        JSON.stringify({ error: 'حدث خطأ أثناء إضافة المنتجات' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrease stock for each product
    console.log('Decreasing stock for ordered items...');
    for (const item of body.items) {
      if (!item.product_id) continue;
      
      // Get current stock
      const { data: currentProduct } = await supabase
        .from('products')
        .select('stock_count')
        .eq('id', item.product_id)
        .single();
      
      if (currentProduct && currentProduct.stock_count !== null) {
        const newStockCount = Math.max(0, currentProduct.stock_count - item.quantity);
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            stock_count: newStockCount,
            // Automatically set in_stock to false if stock is 0
            in_stock: newStockCount > 0
          })
          .eq('id', item.product_id);
        
        if (updateError) {
          console.error('Error updating stock for product:', item.product_id, updateError);
        } else {
          console.log(`Stock updated for ${item.product_name}: ${currentProduct.stock_count} -> ${newStockCount}`);
        }
      }
    }

    // Increment coupon usage if coupon was used
    if (body.coupon_code) {
      await supabase.rpc('increment_coupon_usage', { coupon_code_param: body.coupon_code });
    }

    console.log('Order created successfully:', orderNumber);

    return new Response(
      JSON.stringify({ 
        success: true,
        order: {
          id: order.id,
          order_number: order.order_number,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-order function:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في معالجة الطلب' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
