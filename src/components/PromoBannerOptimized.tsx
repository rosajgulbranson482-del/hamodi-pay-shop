import React, { useState, memo } from 'react';
import { Copy, Check, Tag, X } from 'lucide-react';
import { useDeferredData } from '@/hooks/useDeferredData';
import { toast } from '@/hooks/use-toast';

const PromoBannerOptimized: React.FC = memo(() => {
  const { activeCoupon, isLoading } = useDeferredData();
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleCopy = async () => {
    if (!activeCoupon) return;
    
    try {
      await navigator.clipboard.writeText(activeCoupon.code);
      setCopied(true);
      toast({
        title: "تم النسخ! ✓",
        description: `الكوبون ${activeCoupon.code} تم نسخه`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "خطأ",
        description: "فشل نسخ الكوبون",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !activeCoupon || dismissed) {
    return null;
  }

  const discountText = activeCoupon.discount_type === 'percentage' 
    ? `${activeCoupon.discount_value}%` 
    : `${activeCoupon.discount_value} جنيه`;

  return (
    <div className="bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
      </div>
      
      <div className="container mx-auto px-4 py-3 relative">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Tag className="w-5 h-5" />
          
          <span className="font-bold text-sm md:text-base">
            🎉 خصم {discountText} على طلبك!
          </span>
          
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-full transition-all duration-200 border border-white/30 group"
          >
            <span className="font-mono font-bold text-sm tracking-wider">
              {activeCoupon.code}
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
});

PromoBannerOptimized.displayName = 'PromoBannerOptimized';

export default PromoBannerOptimized;
