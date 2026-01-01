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
    const { code, orderTotal } = await req.json();

    if (!code || typeof code !== 'string') {
      console.error('Invalid coupon code provided');
      return new Response(
        JSON.stringify({ valid: false, error: 'كود الكوبون مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedCode = code.trim().toUpperCase();
    console.log('Validating coupon:', sanitizedCode);

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    if (!coupon) {
      console.log('Coupon not found:', sanitizedCode);
      return new Response(
        JSON.stringify({ valid: false, error: 'كود الكوبون غير صالح' }),
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
