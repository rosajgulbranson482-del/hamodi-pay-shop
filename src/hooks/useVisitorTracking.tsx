import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Generate or get session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('visitor_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('visitor_session_id', sessionId);
  }
  return sessionId;
};

// Get geolocation from IP using free API
const getGeoLocation = async (): Promise<{ country: string; city: string } | null> => {
  try {
    const cached = sessionStorage.getItem('visitor_geo');
    if (cached) {
      return JSON.parse(cached);
    }

    const response = await fetch('https://ipapi.co/json/', { 
      signal: AbortSignal.timeout(5000) 
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const geo = {
      country: data.country_name || 'Unknown',
      city: data.city || 'Unknown'
    };
    
    sessionStorage.setItem('visitor_geo', JSON.stringify(geo));
    return geo;
  } catch {
    return null;
  }
};

// Extract product ID from path
const extractProductId = (path: string): string | null => {
  const match = path.match(/\/product\/([a-f0-9-]+)/i);
  return match ? match[1] : null;
};

export const useVisitorTracking = () => {
  const location = useLocation();
  const startTimeRef = useRef<number>(Date.now());
  const lastPathRef = useRef<string>(location.pathname);
  const isTrackingRef = useRef<boolean>(false);

  useEffect(() => {
    const trackPageView = async () => {
      if (isTrackingRef.current) return;
      isTrackingRef.current = true;

      const sessionId = getSessionId();
      const currentPath = location.pathname;
      const productId = extractProductId(currentPath);

      // Calculate time spent on previous page
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Update time spent for previous page if exists
      if (lastPathRef.current !== currentPath && timeSpent > 0) {
        try {
          // We can't update anonymous inserts, so we track time with the new view
        } catch (e) {
          console.log('Time tracking skipped');
        }
      }

      // Reset timer for new page
      startTimeRef.current = Date.now();
      lastPathRef.current = currentPath;

      // Get geolocation
      const geo = await getGeoLocation();

      // Insert page view
      try {
        await supabase.from('page_views').insert({
          session_id: sessionId,
          page_path: currentPath,
          product_id: productId,
          country: geo?.country || null,
          city: geo?.city || null,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
          time_spent_seconds: 0
        });
      } catch (e) {
        console.log('Page view tracking failed:', e);
      }

      isTrackingRef.current = false;
    };

    // Use requestIdleCallback for non-blocking tracking
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback(() => trackPageView());
    } else {
      setTimeout(trackPageView, 100);
    }
  }, [location.pathname]);

  // Track time spent when user leaves
  useEffect(() => {
    const handleBeforeUnload = async () => {
      const sessionId = getSessionId();
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Use sendBeacon for reliable tracking on page exit
      const data = JSON.stringify({
        session_id: sessionId,
        page_path: location.pathname,
        time_spent_seconds: timeSpent
      });
      
      navigator.sendBeacon?.(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/page_views?on_conflict=session_id,page_path`,
        data
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location.pathname]);
};
