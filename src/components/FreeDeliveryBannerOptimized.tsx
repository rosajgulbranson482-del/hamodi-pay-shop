import React, { useState, memo } from 'react';
import { Truck, X } from 'lucide-react';
import { useDeferredData } from '@/hooks/useDeferredData';

const FreeDeliveryBannerOptimized: React.FC = memo(() => {
  const { deliverySettings, isLoading } = useDeferredData();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || !deliverySettings?.free_delivery_enabled || !deliverySettings?.free_delivery_threshold || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-success via-success/90 to-success text-success-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
      </div>
      
      <div className="container mx-auto px-4 py-2.5 relative">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Truck className="w-5 h-5" />
          
          <span className="font-bold text-sm md:text-base">
            🚚 توصيل مجاني للطلبات فوق {deliverySettings.free_delivery_threshold} جنيه!
          </span>
          
          <span className="text-xs opacity-90 hidden sm:inline bg-white/20 px-3 py-1 rounded-full">
            اطلب الآن واستمتع بالتوصيل المجاني
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

FreeDeliveryBannerOptimized.displayName = 'FreeDeliveryBannerOptimized';

export default FreeDeliveryBannerOptimized;
