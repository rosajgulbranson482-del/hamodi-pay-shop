import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MINUTES = 60;

// Simple in-memory cache for coupons (reset on function restart)
const couponCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

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

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { code, orderTotal } = await req.json();

    if (!code || typeof code !== 'string') {
      const duration = Date.now() - startTime;
      await logToBackend(supabase, 'validate-coupon', 'warning', 'Missing coupon code', 
        null, duration, 400, clientIP, userAgent);
      return new Response(
        JSON.stringify({ valid: false, error: 'كود الكوبون مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedCode = code.trim().toUpperCase();
    
    // Validate code format
    if (sanitizedCode.length > 50 || !/^[A-Z0-9_-]+$/.test(sanitizedCode)) {
      const duration = Date.now() - startTime;
      await logToBackend(supabase, 'validate-coupon', 'warning', 'Invalid coupon format', 
        { code: sanitizedCode }, duration, 400, clientIP, userAgent);
      return new Response(
        JSON.stringify({ valid: false, error: 'صيغة الكوبون غير صحيحة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Validating coupon: ${sanitizedCode} from IP: ${clientIP}`);

    // Check rate limiting
    const oneHourAgo = new Date(Date.now() - BLOCK_DURATION_MINUTES * 60 * 1000).toISOString();
    
    const { count: failedAttempts } = await supabase
      .from('coupon_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', clientIP)
      .eq('success', false)
      .gte('created_at', oneHourAgo);

    const currentAttempts = failedAttempts || 0;

    if (currentAttempts >= MAX_ATTEMPTS) {
      const duration = Date.now() - startTime;
      console.log(`IP ${clientIP} blocked - too many attempts`);
      await logToBackend(supabase, 'validate-coupon', 'warning', 'IP blocked - too many attempts', 
        { ip: clientIP, attempts: currentAttempts }, duration, 429, clientIP, userAgent);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'تم حظرك مؤقتاً بسبب كثرة المحاولات الفاشلة. حاول مرة أخرى بعد ساعة.',
          blocked: true,
          remainingAttempts: 0
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache first
    const cached = couponCache.get(sanitizedCode);
    let coupon = null;
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      coupon = cached.data;
      console.log(`Cache hit for coupon: ${sanitizedCode}`);
    } else {
      // Fetch coupon from database
      const { data, error: couponError } = await supabase
        .from('coupons')
        .select('code, discount_type, discount_value, expires_at, max_uses, used_count, min_order_amount, is_active')
        .eq('code', sanitizedCode)
        .eq('is_active', true)
        .maybeSingle();

      if (couponError) {
        const duration = Date.now() - startTime;
        console.error('Database error:', couponError);
        await logToBackend(supabase, 'validate-coupon', 'error', 'Database error fetching coupon', 
          { error: couponError.message }, duration, 500, clientIP, userAgent);
        return new Response(
          JSON.stringify({ valid: false, error: 'حدث خطأ في التحقق من الكوبون' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      coupon = data;
      if (coupon) {
        couponCache.set(sanitizedCode, { data: coupon, timestamp: Date.now() });
      }
    }

    // Log the attempt
    const isValid = !!coupon;
    await supabase.from('coupon_attempts').insert({
      ip_address: clientIP,
      attempted_code: sanitizedCode,
      success: isValid,
    });

    // Cleanup old attempts (5% chance to reduce frequency)
    if (Math.random() < 0.05) {
      console.log('Running cleanup of old coupon attempts');
      await supabase.rpc('auto_cleanup_old_data');
    }

    if (!coupon) {
      const duration = Date.now() - startTime;
      const remainingAttempts = MAX_ATTEMPTS - currentAttempts - 1;
      await logToBackend(supabase, 'validate-coupon', 'info', 'Invalid coupon code attempted', 
        { code: sanitizedCode }, duration, 200, clientIP, userAgent);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'كود الكوبون غير صالح',
          remainingAttempts: Math.max(0, remainingAttempts)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      const duration = Date.now() - startTime;
      await logToBackend(supabase, 'validate-coupon', 'info', 'Expired coupon attempted', 
        { code: sanitizedCode }, duration, 200, clientIP, userAgent);
      return new Response(
        JSON.stringify({ valid: false, error: 'انتهت صلاحية هذا الكوبون' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max uses
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      const duration = Date.now() - startTime;
      await logToBackend(supabase, 'validate-coupon', 'info', 'Exhausted coupon attempted', 
        { code: sanitizedCode, max_uses: coupon.max_uses }, duration, 200, clientIP, userAgent);
      return new Response(
        JSON.stringify({ valid: false, error: 'تم استنفاد عدد استخدامات هذا الكوبون' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check minimum order amount
    const total = orderTotal || 0;
    if (coupon.min_order_amount && total < coupon.min_order_amount) {
      const duration = Date.now() - startTime;
      await logToBackend(supabase, 'validate-coupon', 'info', 'Minimum order amount not met', 
        { code: sanitizedCode, min_amount: coupon.min_order_amount, order_total: total }, duration, 200, clientIP, userAgent);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `الحد الأدنى للطلب ${coupon.min_order_amount} ج.م لاستخدام هذا الكوبون` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (total * coupon.discount_value) / 100;
    } else {
      discountAmount = coupon.discount_value;
    }
    discountAmount = Math.min(discountAmount, total);

    const duration = Date.now() - startTime;
    console.log(`Coupon validated: ${sanitizedCode}, discount: ${discountAmount}`);
    
    await logToBackend(supabase, 'validate-coupon', 'info', 'Coupon validated successfully', 
      { code: sanitizedCode, discount: discountAmount }, duration, 200, clientIP, userAgent);

    return new Response(
      JSON.stringify({
        valid: true,
        coupon: {
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          discount_amount: discountAmount,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error('Error in validate-coupon function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logToBackend(supabase, 'validate-coupon', 'error', 'Unhandled error', 
      { error: errorMessage }, duration, 500, clientIP, userAgent);
    return new Response(
      JSON.stringify({ valid: false, error: 'حدث خطأ في معالجة الطلب' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});