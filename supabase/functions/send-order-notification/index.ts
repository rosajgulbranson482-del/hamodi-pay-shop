import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'تم التأكيد',
  processing: 'جاري التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

const statusEmojis: Record<string, string> = {
  pending: '⏳',
  confirmed: '✅',
  processing: '📦',
  shipped: '🚚',
  delivered: '🎉',
  cancelled: '❌',
};

interface NotificationRequest {
  orderId: string;
  newStatus: string;
  customerEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, newStatus, customerEmail }: NotificationRequest = await req.json();

    console.log(`Sending notification for order ${orderId}, new status: ${newStatus}, to: ${customerEmail}`);

    if (!orderId || !newStatus || !customerEmail) {
      console.error('Missing required fields:', { orderId, newStatus, customerEmail });
      return new Response(
        JSON.stringify({ error: 'جميع الحقول مطلوبة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      console.error('Invalid email format:', customerEmail);
      return new Response(
        JSON.stringify({ error: 'البريد الإلكتروني غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('order_number, customer_name, total, governorate')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderId, orderError);
      return new Response(
        JSON.stringify({ error: 'الطلب غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const statusLabel = statusLabels[newStatus] || newStatus;
    const statusEmoji = statusEmojis[newStatus] || '📋';
    const currentYear = new Date().getFullYear();

    let extraMessage = '';
    if (newStatus === 'shipped') {
      extraMessage = `
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 15px; margin-top: 20px; text-align: center;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            🚚 طلبك في الطريق إليك! سيصل خلال 2-3 أيام عمل.
          </p>
        </div>
      `;
    } else if (newStatus === 'delivered') {
      extraMessage = `
        <div style="background-color: #d1fae5; border: 1px solid #10b981; border-radius: 12px; padding: 15px; margin-top: 20px; text-align: center;">
          <p style="color: #065f46; margin: 0; font-size: 14px;">
            🎉 شكراً لتسوقك معنا! نتمنى أن تنال المنتجات إعجابك.
          </p>
        </div>
      `;
    } else if (newStatus === 'cancelled') {
      extraMessage = `
        <div style="background-color: #fee2e2; border: 1px solid #ef4444; border-radius: 12px; padding: 15px; margin-top: 20px; text-align: center;">
          <p style="color: #991b1b; margin: 0; font-size: 14px;">
            نأسف لإلغاء طلبك. إذا كان لديك أي استفسار، لا تتردد في التواصل معنا.
          </p>
        </div>
      `;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚡ حمودي ستور</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #1f2937; margin-bottom: 20px; text-align: center;">
              ${statusEmoji} تحديث حالة طلبك
            </h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.8; text-align: center;">
              مرحباً <strong>${order.customer_name}</strong>،
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.8; text-align: center;">
              نود إعلامك بأن حالة طلبك قد تم تحديثها.
            </p>
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
              <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">الحالة الجديدة</p>
              <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: white; padding: 12px 24px; border-radius: 8px; display: inline-block; font-size: 18px; font-weight: bold;">
                ${statusLabel}
              </div>
            </div>
            <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-top: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">رقم الطلب:</td>
                  <td style="padding: 10px 0; color: #1f2937; font-weight: bold; border-bottom: 1px solid #f3f4f6; text-align: left; font-family: monospace;">${order.order_number}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">منطقة التوصيل:</td>
                  <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #f3f4f6; text-align: left;">${order.governorate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280;">الإجمالي:</td>
                  <td style="padding: 10px 0; color: #8b5cf6; font-weight: bold; font-size: 18px; text-align: left;">${order.total} ج.م</td>
                </tr>
              </table>
            </div>
            ${extraMessage}
          </div>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
              هذا البريد تم إرساله تلقائياً من حمودي ستور
            </p>
            <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
              © ${currentYear} حمودي ستور - جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "حمودي ستور <onboarding@resend.dev>",
        to: [customerEmail],
        subject: `${statusEmoji} تحديث حالة طلبك - ${order.order_number}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Email send failed:", emailData);
      return new Response(
        JSON.stringify({ error: emailData.message || 'فشل إرسال البريد' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, emailResponse: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-order-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
