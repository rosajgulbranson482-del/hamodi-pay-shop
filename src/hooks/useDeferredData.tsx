import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DeliverySettings {
  free_delivery_enabled: boolean | null;
  free_delivery_threshold: number | null;
}

interface Coupon {
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
}

interface DeferredData {
  deliverySettings: DeliverySettings | null;
  activeCoupon: Coupon | null;
  isLoading: boolean;
}

// Singleton cache to prevent multiple fetches
let cachedData: DeferredData | null = null;
let fetchPromise: Promise<DeferredData> | null = null;

const fetchDeferredData = async (): Promise<DeferredData> => {
  if (cachedData) return cachedData;
  
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const [deliveryResult, couponResult] = await Promise.all([
      supabase
        .from('delivery_settings')
        .select('free_delivery_enabled, free_delivery_threshold')
        .limit(1)
        .single(),
      supabase
        .from('coupons')
        .select('code, discount_type, discount_value, expires_at')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('discount_value', { ascending: false })
        .limit(1)
        .single()
    ]);

    const data: DeferredData = {
      deliverySettings: deliveryResult.data || null,
      activeCoupon: couponResult.data || null,
      isLoading: false
    };

    cachedData = data;
    return data;
  })();

  return fetchPromise;
};

export const useDeferredData = () => {
  const [data, setData] = useState<DeferredData>({
    deliverySettings: cachedData?.deliverySettings || null,
    activeCoupon: cachedData?.activeCoupon || null,
    isLoading: !cachedData
  });

  useEffect(() => {
    if (cachedData) {
      setData({ ...cachedData, isLoading: false });
      return;
    }

    let timeoutId: number;
    const win = typeof window !== 'undefined' ? window : null;
    
    // Defer fetching until after initial render
    if (win && 'requestIdleCallback' in win) {
      timeoutId = win.requestIdleCallback(() => {
        fetchDeferredData().then(setData);
      });
    } else if (win) {
      timeoutId = win.setTimeout(() => {
        fetchDeferredData().then(setData);
      }, 100);
    }

    return () => {
      if (win && 'cancelIdleCallback' in win) {
        win.cancelIdleCallback(timeoutId);
      } else if (win) {
        win.clearTimeout(timeoutId);
      }
    };
  }, []);

  return data;
};

// Preload function to call early
export const preloadDeferredData = () => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => fetchDeferredData());
  } else {
    setTimeout(() => fetchDeferredData(), 50);
  }
};
