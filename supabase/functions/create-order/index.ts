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
    const body: CreateOrderRequest = await req.json();
    
    // === VALIDATION PHASE ===
    const validationError = validateOrderRequest(body);
    if (validationError) {
      const duration = Date.now() - startTime;
      console.log(`Validation failed: ${validationError}`);
      await logToBackend(supabase, 'create-order', 'warning', `Validation failed: ${validationError}`, 
        { customer_phone: body.customer_phone?.slice(-4) }, duration, 400, clientIP, userAgent);
      return new Response(
        JSON.stringify({ error: validationError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating order for: ${body.customer_name}, Items: ${body.items.length}`);

    // === STOCK CHECK PHASE (Single Query) ===
    const productIds = body.items.filter(item => item.product_id).map(item => item.product_id);
    
    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, stock_count, in_stock')
        .in('id', productIds);

      if (productsError) {
        const duration = Date.now() - startTime;
        console.error('Error fetching products:', productsError);
        await logToBackend(supabase, 'create-order', 'error', 'Error fetching products', 
          { error: productsError.message }, duration, 500, clientIP, userAgent);
        return new Response(
          JSON.stringify({ error: 'حدث خطأ أثناء التحقق من المخزون' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate stock for all items at once
      const stockError = validateStock(body.items, products || []);
      if (stockError) {
        const duration = Date.now() - startTime;
        console.log(`Stock validation failed: ${stockError}`);
        await logToBackend(supabase, 'create-order', 'warning', `Stock validation failed: ${stockError}`, 
          { items: body.items.length }, duration, 400, clientIP, userAgent);
        return new Response(
          JSON.stringify({ error: stockError }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // === ORDER CREATION PHASE ===
    const orderNumber = generateOrderNumber();

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
      .select('id, order_number')
      .single();

    if (orderError) {
      const duration = Date.now() - startTime;
      console.error('Error creating order:', orderError);
      await logToBackend(supabase, 'create-order', 'error', 'Error creating order', 
        { error: orderError.message }, duration, 500, clientIP, userAgent);
      return new Response(
        JSON.stringify({ error: 'حدث خطأ أثناء إنشاء الطلب' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === ORDER ITEMS PHASE (Batch Insert) ===
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
      const duration = Date.now() - startTime;
      console.error('Error creating order items:', itemsError);
      await logToBackend(supabase, 'create-order', 'error', 'Error creating order items - rollback', 
        { error: itemsError.message, order_id: order.id }, duration, 500, clientIP, userAgent);
      // Rollback order
      await supabase.from('orders').delete().eq('id', order.id);
      return new Response(
        JSON.stringify({ error: 'حدث خطأ أثناء إضافة المنتجات' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === STOCK UPDATE PHASE (Batch Update using RPC) ===
    const productUpdates = body.items
      .filter(item => item.product_id)
      .map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));

    if (productUpdates.length > 0) {
      const { error: stockError } = await supabase.rpc('batch_update_stock', {
        product_updates: JSON.stringify(productUpdates)
      });

      if (stockError) {
        console.error('Error updating stock (non-critical):', stockError);
        await logToBackend(supabase, 'create-order', 'warning', 'Error updating stock (non-critical)', 
          { error: stockError.message, order_number: orderNumber }, undefined, undefined, clientIP, userAgent);
      } else {
        console.log(`Stock updated for ${productUpdates.length} products`);
      }
    }

    // === COUPON UPDATE PHASE ===
    if (body.coupon_code) {
      await supabase.rpc('increment_coupon_usage', { coupon_code_param: body.coupon_code });
    }

    const duration = Date.now() - startTime;
    console.log(`Order ${orderNumber} created successfully in ${duration}ms`);
    
    // Log successful order creation
    await logToBackend(supabase, 'create-order', 'info', `Order created successfully: ${orderNumber}`, 
      { order_number: orderNumber, total: body.total, items_count: body.items.length, governorate: body.governorate },
      duration, 200, clientIP, userAgent);

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

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error('Error in create-order function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logToBackend(supabase, 'create-order', 'error', 'Unhandled error in create-order', 
      { error: errorMessage }, duration, 500, clientIP, userAgent);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في معالجة الطلب' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// === HELPER FUNCTIONS ===

function validateOrderRequest(body: CreateOrderRequest): string | null {
  if (!body.customer_name?.trim()) return 'اسم العميل مطلوب';
  if (!body.customer_phone?.trim()) return 'رقم الهاتف مطلوب';
  if (!body.customer_address?.trim()) return 'العنوان مطلوب';
  if (!body.governorate?.trim()) return 'المحافظة مطلوبة';
  if (!body.payment_method?.trim()) return 'طريقة الدفع مطلوبة';
  if (!body.items || body.items.length === 0) return 'يجب إضافة منتج واحد على الأقل';
  
  if (typeof body.subtotal !== 'number' || body.subtotal < 0) return 'المجموع الفرعي غير صالح';
  if (typeof body.delivery_fee !== 'number' || body.delivery_fee < 0) return 'رسوم التوصيل غير صالحة';
  if (typeof body.total !== 'number' || body.total < 0) return 'المجموع غير صالح';

  for (const item of body.items) {
    if (!item.product_name?.trim() || typeof item.product_price !== 'number' || typeof item.quantity !== 'number') {
      return 'بيانات المنتجات غير صالحة';
    }
  }

  if (body.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customer_email)) {
    return 'البريد الإلكتروني غير صالح';
  }

  return null;
}

function validateStock(items: OrderItem[], products: any[]): string | null {
  for (const item of items) {
    if (!item.product_id) continue;
    
    const product = products.find(p => p.id === item.product_id);
    
    if (!product) {
      return `المنتج "${item.product_name}" غير موجود`;
    }

    if (product.in_stock === false) {
      return `المنتج "${item.product_name}" غير متوفر حالياً`;
    }

    if (product.stock_count !== null && product.stock_count < item.quantity) {
      if (product.stock_count === 0) {
        return `المنتج "${item.product_name}" نفذ من المخزون`;
      }
      return `الكمية المطلوبة من "${item.product_name}" غير متوفرة. المتاح: ${product.stock_count} قطعة فقط`;
    }
  }
  return null;
}

function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `HS-${dateStr}-${randomNum}`;
}