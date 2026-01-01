import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderNumber, phoneLast4 } = await req.json();

    if (!orderNumber || typeof orderNumber !== 'string') {
      console.error('Invalid order number provided:', orderNumber);
      return new Response(
        JSON.stringify({ error: 'رقم الطلب مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phoneLast4 || typeof phoneLast4 !== 'string' || phoneLast4.length !== 4) {
      console.error('Invalid phone last 4 digits:', phoneLast4);
      return new Response(
        JSON.stringify({ error: 'آخر 4 أرقام من رقم الهاتف مطلوبة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone last 4 digits are numeric
    if (!/^\d{4}$/.test(phoneLast4)) {
      console.error('Phone last 4 digits not numeric:', phoneLast4);
      return new Response(
        JSON.stringify({ error: 'آخر 4 أرقام يجب أن تكون أرقام فقط' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate order number format (basic sanitization)
    const sanitizedOrderNumber = orderNumber.trim().toUpperCase();
    if (sanitizedOrderNumber.length < 5 || sanitizedOrderNumber.length > 50) {
      console.error('Order number has invalid length:', sanitizedOrderNumber.length);
      return new Response(
        JSON.stringify({ error: 'رقم الطلب غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tracking order:', sanitizedOrderNumber);

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order with limited fields (no full address for privacy)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        created_at,
        updated_at,
        subtotal,
        delivery_fee,
        discount_amount,
        total,
        governorate,
        payment_method,
        payment_confirmed,
        customer_phone
      `)
      .eq('order_number', sanitizedOrderNumber)
      .single();

    if (orderError || !order) {
      console.log('Order not found:', sanitizedOrderNumber);
      return new Response(
        JSON.stringify({ error: 'الطلب غير موجود أو البيانات غير صحيحة' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify phone last 4 digits match
    const orderPhoneLast4 = order.customer_phone.slice(-4);
    if (orderPhoneLast4 !== phoneLast4) {
      console.log('Phone verification failed for order:', sanitizedOrderNumber);
      return new Response(
        JSON.stringify({ error: 'الطلب غير موجود أو البيانات غير صحيحة' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove customer_phone from response for privacy
    const { customer_phone, ...orderWithoutPhone } = order;

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('id, product_name, product_price, quantity')
      .eq('order_id', order.id);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
    }

    console.log('Order found and verified successfully:', sanitizedOrderNumber);

    return new Response(
      JSON.stringify({ 
        order: {
          ...orderWithoutPhone,
          items: items || []
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in track-order function:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في معالجة الطلب' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
