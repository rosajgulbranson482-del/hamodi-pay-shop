import React, { useState, useEffect } from 'react';
import { Copy, Check, Tag, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Coupon {
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
}

const PromoBanner: React.FC = () => {
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveCoupon = async () => {
      try {
        const { data, error } = await supabase
          .from('coupons')
          .select('code, discount_type, discount_value, expires_at')
          .eq('is_active', true)
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
          .order('discount_value', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching coupon:', error);
        }
        
        if (data) {
          setCoupon(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveCoupon();
  }, []);

  const handleCopy = async () => {
    if (!coupon) return;
    
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      toast({
        title: "تم النسخ! ✓",
        description: `الكوبون ${coupon.code} تم نسخه`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "خطأ",
        description: "فشل نسخ الكوبون",
        variant: "destructive",
      });
    }
  };

  if (loading || !coupon || dismissed) {
    return null;
  }

  const discountText = coupon.discount_type === 'percentage' 
    ? `${coupon.discount_value}%` 
    : `${coupon.discount_value} جنيه`;

  return (
    <div className="bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
      </div>
      
      <div className="container mx-auto px-4 py-3 relative">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Tag className="w-5 h-5 animate-bounce" />
          
          <span className="font-bold text-sm md:text-base">
            🎉 خصم {discountText} على طلبك!
          </span>
          
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-full transition-all duration-200 border border-white/30 group"
          >
            <span className="font-mono font-bold text-sm tracking-wider">
              {coupon.code}
            </span>
            {copied ? (
              <Check className="w-4 h-4 text-green-300" />
            ) : (
              <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
            )}
          </button>
          
          <span className="text-xs opacity-80 hidden sm:inline">
            انسخ الكود واستخدمه عند الشراء
          </span>
          
          <button
            onClick={() => setDismissed(true)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoBanner;
