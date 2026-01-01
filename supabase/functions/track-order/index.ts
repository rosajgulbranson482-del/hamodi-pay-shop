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
    const { orderNumber } = await req.json();

    if (!orderNumber || typeof orderNumber !== 'string') {
      console.error('Invalid order number provided:', orderNumber);
      return new Response(
        JSON.stringify({ error: 'رقم الطلب مطلوب' }),
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
        payment_confirmed
      `)
      .eq('order_number', sanitizedOrderNumber)
      .single();

    if (orderError || !order) {
      console.log('Order not found:', sanitizedOrderNumber);
      return new Response(
        JSON.stringify({ error: 'الطلب غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('id, product_name, product_price, quantity')
      .eq('order_id', order.id);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
    }

    console.log('Order found successfully:', sanitizedOrderNumber);

    return new Response(
      JSON.stringify({ 
        order: {
          ...order,
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
