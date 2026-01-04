import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const MAX_ATTEMPTS = 5; // Max attempts per hour
const BLOCK_DURATION_MINUTES = 60; // Block duration in minutes

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, orderTotal } = await req.json();

    // Get client IP from headers
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    console.log('Coupon validation attempt from IP:', clientIP);

    if (!code || typeof code !== 'string') {
      console.error('Invalid coupon code provided');
      return new Response(
        JSON.stringify({ valid: false, error: 'كود الكوبون مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedCode = code.trim().toUpperCase();
    
    // Validate code format (prevent injection)
    if (sanitizedCode.length > 50 || !/^[A-Z0-9_-]+$/.test(sanitizedCode)) {
      console.error('Invalid coupon code format:', sanitizedCode);
      return new Response(
        JSON.stringify({ valid: false, error: 'صيغة الكوبون غير صحيحة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Validating coupon:', sanitizedCode);

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limiting - count failed attempts in the last hour
    const oneHourAgo = new Date(Date.now() - BLOCK_DURATION_MINUTES * 60 * 1000).toISOString();
    
    const { count: failedAttempts, error: countError } = await supabase
      .from('coupon_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', clientIP)
      .eq('success', false)
      .gte('created_at', oneHourAgo);

    if (countError) {
      console.error('Error checking rate limit:', countError);
    }

    const currentAttempts = failedAttempts || 0;
    console.log(`IP ${clientIP} has ${currentAttempts} failed attempts in the last hour`);

    // Check if blocked
    if (currentAttempts >= MAX_ATTEMPTS) {
      console.log(`IP ${clientIP} is blocked due to too many failed attempts`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `تم حظرك مؤقتاً بسبب كثرة المحاولات الفاشلة. حاول مرة أخرى بعد ساعة.`,
          blocked: true,
          remainingAttempts: 0
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch coupon with service role
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('code, discount_type, discount_value, expires_at, max_uses, used_count, min_order_amount, is_active')
      .eq('code', sanitizedCode)
      .eq('is_active', true)
      .maybeSingle();

    if (couponError) {
      console.error('Database error:', couponError);
      return new Response(
        JSON.stringify({ valid: false, error: 'حدث خطأ في التحقق من الكوبون' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the attempt
    const isValid = !!coupon;
    await supabase.from('coupon_attempts').insert({
      ip_address: clientIP,
      attempted_code: sanitizedCode,
      success: isValid,
    });

    // Cleanup old attempts occasionally (1% chance per request)
    if (Math.random() < 0.01) {
      console.log('Running cleanup of old coupon attempts');
      await supabase.rpc('cleanup_old_coupon_attempts');
    }

    if (!coupon) {
      const remainingAttempts = MAX_ATTEMPTS - currentAttempts - 1;
      console.log('Coupon not found:', sanitizedCode, `Remaining attempts: ${remainingAttempts}`);
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
      console.log('Coupon expired:', sanitizedCode);
      return new Response(
        JSON.stringify({ valid: false, error: 'انتهت صلاحية هذا الكوبون' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max uses
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      console.log('Coupon usage limit reached:', sanitizedCode);
      return new Response(
        JSON.stringify({ valid: false, error: 'تم استنفاد عدد استخدامات هذا الكوبون' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check minimum order amount
    const total = orderTotal || 0;
    if (coupon.min_order_amount && total < coupon.min_order_amount) {
      console.log('Order total below minimum:', total, 'required:', coupon.min_order_amount);
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

    // Don't let discount exceed total
    discountAmount = Math.min(discountAmount, total);

    console.log('Coupon validated successfully:', sanitizedCode, 'discount:', discountAmount);

    // Return only necessary info - NOT exposing max_uses, used_count, expires_at
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

  } catch (error) {
    console.error('Error in validate-coupon function:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'حدث خطأ في معالجة الطلب' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});