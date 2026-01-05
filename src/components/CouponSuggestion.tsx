import React, { useState, useEffect } from 'react';
import { Tag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Coupon {
  code: string;
  discount_type: string;
  discount_value: number;
}

interface CouponSuggestionProps {
  onApply: (code: string) => void;
  appliedCouponCode?: string | null;
}

const CouponSuggestion: React.FC<CouponSuggestionProps> = ({ onApply, appliedCouponCode }) => {
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveCoupon = async () => {
      try {
        const { data, error } = await supabase
          .from('coupons')
          .select('code, discount_type, discount_value')
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

  // Don't show if loading, no coupon, or already applied
  if (loading || !coupon || appliedCouponCode === coupon.code) {
    return null;
  }

  const discountText = coupon.discount_type === 'percentage' 
    ? `${coupon.discount_value}%` 
    : `${coupon.discount_value} جنيه`;

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/30 rounded-xl p-3 animate-pulse-slow">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground flex items-center gap-1">
              <Tag className="w-3 h-3" />
              عرض خاص لك!
            </p>
            <p className="text-xs text-muted-foreground">
              استخدم كود <span className="font-mono font-bold text-primary">{coupon.code}</span> واحصل على خصم {discountText}
            </p>
          </div>
        </div>
        
        <Button 
          size="sm" 
          onClick={() => onApply(coupon.code)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
        >
          تطبيق الآن
        </Button>
      </div>
    </div>
  );
};

export default CouponSuggestion;
