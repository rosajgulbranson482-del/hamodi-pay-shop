import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to log to backend_logs table
async function logToBackend(
  supabase: any, 
  functionName: string, 
  logType: 'info' | 'error' | 'warning' | 'debug',
  message: string,
  details?: any,
  executionTimeMs?: number,
  statusCode?: number,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await supabase.from('backend_logs').insert({
      function_name: functionName,
      log_type: logType,
      message,
      details: details ? JSON.stringify(details) : null,
      execution_time_ms: executionTimeMs || null,
      status_code: statusCode || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    });
  } catch (e) {
    console.error('Failed to log to backend_logs:', e);
  }
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client info for logging
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Create Supabase client with service role to bypass RLS
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { orderNumber, phoneLast4 } = await req.json();

    if (!orderNumber || typeof orderNumber !== 'string') {
      const duration = Date.now() - startTime;
      console.error('Invalid order number provided:', orderNumber);
      await logToBackend(supabase, 'track-order', 'warning', 'Invalid order number', 
        null, duration, 400, clientIP, userAgent);
      return new Response(
        JSON.stringify({ error: 'رقم الطلب مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phoneLast4 || typeof phoneLast4 !== 'string' || phoneLast4.length !== 4) {
      const duration = Date.now() - startTime;
      console.error('Invalid phone last 4 digits:', phoneLast4);
      await logToBackend(supabase, 'track-order', 'warning', 'Invalid phone digits', 
        null, duration, 400, clientIP, userAgent);
      return new Response(
        JSON.stringify({ error: 'آخر 4 أرقام من رقم الهاتف مطلوبة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone last 4 digits are numeric
    if (!/^\d{4}$/.test(phoneLast4)) {
      const duration = Date.now() - startTime;
      console.error('Phone last 4 digits not numeric:', phoneLast4);
      await logToBackend(supabase, 'track-order', 'warning', 'Phone digits not numeric', 
        null, duration, 400, clientIP, userAgent);
      return new Response(
        JSON.stringify({ error: 'آخر 4 أرقام يجب أن تكون أرقام فقط' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate order number format (basic sanitization)
    const sanitizedOrderNumber = orderNumber.trim().toUpperCase();
    if (sanitizedOrderNumber.length < 5 || sanitizedOrderNumber.length > 50) {
      const duration = Date.now() - startTime;
      console.error('Order number has invalid length:', sanitizedOrderNumber.length);
      await logToBackend(supabase, 'track-order', 'warning', 'Invalid order number length', 
        { length: sanitizedOrderNumber.length }, duration, 400, clientIP, userAgent);
      return new Response(
        JSON.stringify({ error: 'رقم الطلب غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tracking order:', sanitizedOrderNumber);

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
      const duration = Date.now() - startTime;
      console.log('Order not found:', sanitizedOrderNumber);
      await logToBackend(supabase, 'track-order', 'info', 'Order not found', 
        { order_number: sanitizedOrderNumber }, duration, 404, clientIP, userAgent);
      return new Response(
        JSON.stringify({ error: 'الطلب غير موجود أو البيانات غير صحيحة' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify phone last 4 digits match
    const orderPhoneLast4 = order.customer_phone.slice(-4);
    if (orderPhoneLast4 !== phoneLast4) {
      const duration = Date.now() - startTime;
      console.log('Phone verification failed for order:', sanitizedOrderNumber);
      await logToBackend(supabase, 'track-order', 'warning', 'Phone verification failed', 
        { order_number: sanitizedOrderNumber }, duration, 404, clientIP, userAgent);
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

    const duration = Date.now() - startTime;
    console.log('Order found and verified successfully:', sanitizedOrderNumber);
    
    await logToBackend(supabase, 'track-order', 'info', 'Order tracked successfully', 
      { order_number: sanitizedOrderNumber, status: order.status }, duration, 200, clientIP, userAgent);

    return new Response(
      JSON.stringify({ 
        order: {
          ...orderWithoutPhone,
          items: items || []
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error('Error in track-order function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logToBackend(supabase, 'track-order', 'error', 'Unhandled error', 
      { error: errorMessage }, duration, 500, clientIP, userAgent);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في معالجة الطلب' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});