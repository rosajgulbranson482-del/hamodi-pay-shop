import React, { useState, useEffect, memo } from 'react';
import { Truck, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DeliverySettings {
  free_delivery_enabled: boolean;
  free_delivery_threshold: number;
}

const FreeDeliveryBanner: React.FC = memo(() => {
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('delivery_settings')
          .select('free_delivery_enabled, free_delivery_threshold')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching delivery settings:', error);
        }
        
        if (data) {
          setSettings(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading || !settings || !settings.free_delivery_enabled || !settings.free_delivery_threshold || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-success via-success/90 to-success text-success-foreground relative overflow-hidden animate-fade-in">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
      
      <div className="container mx-auto px-4 py-2.5 relative">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Truck className="w-5 h-5 animate-bounce" />
          
          <span className="font-bold text-sm md:text-base">
            🚚 توصيل مجاني للطلبات فوق {settings.free_delivery_threshold} جنيه!
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

FreeDeliveryBanner.displayName = 'FreeDeliveryBanner';

export default FreeDeliveryBanner;
