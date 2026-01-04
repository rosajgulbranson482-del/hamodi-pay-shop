import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Zap, LogOut, Package, ShoppingBag, Bell, Loader2, Ticket, Star, BarChart3, MapPin, BellRing } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load admin components for better performance
const AdminOrders = lazy(() => import('@/components/admin/AdminOrders'));
const AdminProducts = lazy(() => import('@/components/admin/AdminProducts'));
const AdminCoupons = lazy(() => import('@/components/admin/AdminCoupons'));
const AdminReviews = lazy(() => import('@/components/admin/AdminReviews'));
const AdminStats = lazy(() => import('@/components/admin/AdminStats'));
const AdminCenters = lazy(() => import('@/components/admin/AdminCenters'));
const AdminStockNotifications = lazy(() => import('@/components/admin/AdminStockNotifications'));

// Loading fallback component
const TabLoadingFallback = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
    <Skeleton className="h-64" />
  </div>
);

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    const checkAdminRole = async (userId: string) => {
      const { data } = await supabase.rpc('has_role', { 
        _user_id: userId, 
        _role: 'admin' 
      });
      return data === true;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
        setLoading(false);
        return;
      }
      
      setUser(session.user);
      
      setTimeout(async () => {
        const hasAdminRole = await checkAdminRole(session.user.id);
        if (!hasAdminRole) {
          await supabase.auth.signOut();
          toast({
            title: "غير مصرح",
            description: "ليس لديك صلاحية الوصول للوحة التحكم",
            variant: "destructive",
          });
          navigate('/auth');
        } else {
          setIsAdmin(true);
        }
        setLoading(false);
      }, 0);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        setLoading(false);
        return;
      }

      setUser(session.user);
      const hasAdminRole = await checkAdminRole(session.user.id);
      
      if (!hasAdminRole) {
        await supabase.auth.signOut();
        toast({
          title: "غير مصرح",
          description: "ليس لديك صلاحية الوصول للوحة التحكم",
          variant: "destructive",
        });
        navigate('/auth');
      } else {
        setIsAdmin(true);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // Subscribe to new orders with realtime notifications
  useEffect(() => {
    if (!isAdmin) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel('admin-realtime-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new as { 
            customer_name: string; 
            order_number: string; 
            total: number;
          };
          
          setNewOrdersCount(prev => prev + 1);
          
          // Show toast notification
          toast({
            title: "🛒 طلب جديد!",
            description: `طلب رقم ${newOrder.order_number} - ${newOrder.customer_name} - ${Number(newOrder.total).toLocaleString()} ج.م`,
          });

          // Browser notification (if permitted)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🛒 طلب جديد!', {
              body: `طلب من ${newOrder.customer_name} - ${Number(newOrder.total).toLocaleString()} ج.م`,
              icon: '/favicon.ico',
              tag: 'new-order'
            });
          }

          // Play notification sound (built-in beep)
          try {
            const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
          } catch (e) {
            console.log('Audio notification not available:', e);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'orders') {
      setNewOrdersCount(0);
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet>
        <title>لوحة التحكم | حمودي ستور</title>
        <meta name="description" content="لوحة تحكم حمودي ستور لإدارة المنتجات والطلبات" />
        <link rel="canonical" href={`${window.location.origin}/admin`} />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 gradient-primary rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm md:text-lg font-bold text-foreground">لوحة التحكم</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground truncate max-w-[120px] md:max-w-none">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-3">
              {newOrdersCount > 0 && (
                <div className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-destructive/10 rounded-full">
                  <Bell className="w-3.5 h-3.5 md:w-4 md:h-4 text-destructive animate-pulse" />
                  <span className="text-xs md:text-sm font-medium text-destructive">{newOrdersCount}</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate('/')} className="h-8 md:h-9 px-2 md:px-3">
                <ShoppingBag className="w-4 h-4 md:ml-2" />
                <span className="hidden md:inline">المتجر</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8 md:h-9 px-2 md:px-3">
                <LogOut className="w-4 h-4 md:ml-2" />
                <span className="hidden md:inline">خروج</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full max-w-5xl grid-cols-7 h-auto p-1">
            <TabsTrigger value="stats" className="flex-col md:flex-row gap-1 md:gap-2 py-2 md:py-1.5 text-xs md:text-sm">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">الإحصائيات</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="relative flex-col md:flex-row gap-1 md:gap-2 py-2 md:py-1.5 text-xs md:text-sm">
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">الطلبات</span>
              {newOrdersCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 md:-top-2 md:-right-2 h-4 w-4 md:h-5 md:w-5 p-0 flex items-center justify-center text-[10px] md:text-xs">
                  {newOrdersCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="products" className="flex-col md:flex-row gap-1 md:gap-2 py-2 md:py-1.5 text-xs md:text-sm">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">المنتجات</span>
            </TabsTrigger>
            <TabsTrigger value="coupons" className="flex-col md:flex-row gap-1 md:gap-2 py-2 md:py-1.5 text-xs md:text-sm">
              <Ticket className="w-4 h-4" />
              <span className="hidden sm:inline">الكوبونات</span>
            </TabsTrigger>
            <TabsTrigger value="centers" className="flex-col md:flex-row gap-1 md:gap-2 py-2 md:py-1.5 text-xs md:text-sm">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">المراكز</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex-col md:flex-row gap-1 md:gap-2 py-2 md:py-1.5 text-xs md:text-sm">
              <BellRing className="w-4 h-4" />
              <span className="hidden sm:inline">الإشعارات</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-col md:flex-row gap-1 md:gap-2 py-2 md:py-1.5 text-xs md:text-sm">
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">التقييمات</span>
            </TabsTrigger>
          </TabsList>

          <Suspense fallback={<TabLoadingFallback />}>
            <TabsContent value="stats">
              {activeTab === 'stats' && <AdminStats />}
            </TabsContent>

            <TabsContent value="orders">
              {activeTab === 'orders' && <AdminOrders />}
            </TabsContent>

            <TabsContent value="products">
              {activeTab === 'products' && <AdminProducts />}
            </TabsContent>

            <TabsContent value="coupons">
              {activeTab === 'coupons' && <AdminCoupons />}
            </TabsContent>

            <TabsContent value="centers">
              {activeTab === 'centers' && <AdminCenters />}
            </TabsContent>

            <TabsContent value="notifications">
              {activeTab === 'notifications' && <AdminStockNotifications />}
            </TabsContent>

            <TabsContent value="reviews">
              {activeTab === 'reviews' && <AdminReviews />}
            </TabsContent>
          </Suspense>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;