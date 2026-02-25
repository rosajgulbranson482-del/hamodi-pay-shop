import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StockNotificationRequest {
  product_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Admin authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const userId = claimsData.claims.sub;
    const { data: isAdmin } = await authClient.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden - admin only' }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { product_id }: StockNotificationRequest = await req.json();

    if (!product_id) {
      console.error("Missing product_id");
      return new Response(
        JSON.stringify({ error: "product_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing stock notifications for product: ${product_id}`);

    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, image, price, in_stock, stock_count")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      console.error("Product not found:", productError);
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if product is actually in stock
    if (!product.in_stock || (product.stock_count !== null && product.stock_count <= 0)) {
      console.log("Product is not in stock, skipping notifications");
      return new Response(
        JSON.stringify({ message: "Product is not in stock", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch pending notifications for this product
    const { data: notifications, error: notificationsError } = await supabase
      .from("stock_notifications")
      .select("*")
      .eq("product_id", product_id)
      .eq("notified", false);

    if (notificationsError) {
      console.error("Error fetching notifications:", notificationsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch notifications" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!notifications || notifications.length === 0) {
      console.log("No pending notifications found");
      return new Response(
        JSON.stringify({ message: "No pending notifications", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${notifications.length} pending notifications`);

    let sentCount = 0;
    const errors: string[] = [];

    // Send notifications to each customer
    for (const notification of notifications) {
      if (notification.email) {
        try {
          const emailHtml = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 خبر سار!</h1>
                </div>
                <div style="padding: 30px;">
                  <h2 style="color: #333; margin-bottom: 20px; text-align: center;">المنتج الذي تنتظره أصبح متوفراً الآن!</h2>
                  
                  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
                    ${product.image ? `<img src="${product.image}" alt="${product.name}" style="max-width: 200px; height: auto; border-radius: 8px; margin-bottom: 15px;">` : ''}
                    <h3 style="color: #333; margin: 10px 0;">${product.name}</h3>
                    <p style="color: #667eea; font-size: 24px; font-weight: bold; margin: 10px 0;">${product.price} ج.م</p>
                  </div>
                  
                  <p style="color: #666; text-align: center; margin-bottom: 25px;">
                    سارع بالطلب الآن قبل نفاذ الكمية!
                  </p>
                </div>
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    تلقيت هذا البريد لأنك طلبت إشعارك عند توفر هذا المنتج.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `;

          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "متجرنا <onboarding@resend.dev>",
              to: [notification.email],
              subject: `🎉 ${product.name} أصبح متوفراً الآن!`,
              html: emailHtml,
            }),
          });

          if (!emailResponse.ok) {
            const errorData = await emailResponse.json();
            throw new Error(errorData.message || "Failed to send email");
          }

          console.log(`Email sent to ${notification.email}`);

          // Mark notification as sent
          await supabase
            .from("stock_notifications")
            .update({ notified: true, notified_at: new Date().toISOString() })
            .eq("id", notification.id);

          sentCount++;
        } catch (emailError: any) {
          console.error(`Failed to send email to ${notification.email}:`, emailError);
          errors.push(`Failed to send to ${notification.email}: ${emailError.message}`);
        }
      }
    }

    console.log(`Successfully sent ${sentCount} notifications`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${sentCount} notifications`, 
        sent: sentCount,
        total: notifications.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-stock-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
