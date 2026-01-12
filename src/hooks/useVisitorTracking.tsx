import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Get or create session ID - lightweight
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('visitor_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('visitor_session_id', sessionId);
  }
  return sessionId;
};

// Lightweight geo lookup - cached
let geoCache: { country: string; city: string } | null = null;
const getGeoLocation = async () => {
  if (geoCache) return geoCache;
  
  const cached = sessionStorage.getItem('visitor_geo');
  if (cached) {
    geoCache = JSON.parse(cached);
    return geoCache;
  }
  
  try {
    const response = await fetch('https://ipapi.co/json/', { 
      signal: AbortSignal.timeout(3000) // 3s timeout
    });
    if (response.ok) {
      const data = await response.json();
      geoCache = { country: data.country_name || 'Unknown', city: data.city || 'Unknown' };
      sessionStorage.setItem('visitor_geo', JSON.stringify(geoCache));
      return geoCache;
    }
  } catch {
    // Silently fail
  }
  return null;
};

// Extract product ID from path
const extractProductId = (path: string): string | null => {
  const match = path.match(/^\/product\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
};

export const useVisitorTracking = () => {
  const location = useLocation();
  const startTimeRef = useRef<number>(Date.now());
  const lastPathRef = useRef<string>('');

  useEffect(() => {
    const currentPath = location.pathname;
    
    // Skip if same path
    if (currentPath === lastPathRef.current) return;
    lastPathRef.current = currentPath;
    startTimeRef.current = Date.now();

    // Defer tracking to not block main thread
    const trackPageView = async () => {
      const sessionId = getSessionId();
      const productId = extractProductId(currentPath);
      const geo = await getGeoLocation();

      try {
        await supabase.from('page_views').insert({
          session_id: sessionId,
          page_path: currentPath,
          product_id: productId,
          country: geo?.country || null,
          city: geo?.city || null,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
        });
      } catch {
        // Silently fail
      }
    };

    // Use requestIdleCallback for non-blocking tracking
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => trackPageView(), { timeout: 5000 });
    } else {
      setTimeout(trackPageView, 1000);
    }
  }, [location.pathname]);

  // Track time spent on page exit - using sendBeacon for reliability
  useEffect(() => {
    const handleUnload = () => {
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      
      if (timeSpent > 0 && timeSpent < 3600) { // Max 1 hour
        const sessionId = getSessionId();
        const data = JSON.stringify({
          session_id: sessionId,
          page_path: location.pathname,
          time_spent_seconds: timeSpent,
        });
        
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/update_time_spent`,
          new Blob([data], { type: 'application/json' })
        );
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [location.pathname]);
};
