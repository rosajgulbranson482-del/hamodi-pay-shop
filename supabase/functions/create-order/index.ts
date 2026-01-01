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

    console.log('Creating order for:', body.customer_name, 'Phone:', body.customer_phone);

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
