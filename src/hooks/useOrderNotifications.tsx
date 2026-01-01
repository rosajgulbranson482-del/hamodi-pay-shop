import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];

export const useOrderNotifications = (enabled: boolean = true) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Create notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1oc2l0bnBvb3R0c3N0dHR0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==');

    const channel = supabase
      .channel('admin-order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new as Order;
          
          // Play notification sound
          if (audioRef.current) {
            audioRef.current.play().catch(console.error);
          }

          // Show toast notification
          toast.success('🛒 طلب جديد!', {
            description: `طلب رقم ${newOrder.order_number} - ${newOrder.customer_name} - ${newOrder.total.toLocaleString()} ج.م`,
            duration: 10000,
            action: {
              label: 'عرض الطلبات',
              onClick: () => {
                window.location.href = '/admin';
              }
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
};
