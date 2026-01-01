import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  ArrowRight, 
  Loader2, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  XCircle,
  ShoppingBag
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: OrderStatus;
  created_at: string;
}

const statusConfig: Record<OrderStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: 'قيد الانتظار', icon: <Clock className="w-4 h-4" />, color: 'bg-yellow-500' },
  confirmed: { label: 'تم التأكيد', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-blue-500' },
  processing: { label: 'جاري التجهيز', icon: <Package className="w-4 h-4" />, color: 'bg-purple-500' },
  shipped: { label: 'تم الشحن', icon: <Truck className="w-4 h-4" />, color: 'bg-orange-500' },
  delivered: { label: 'تم التوصيل', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-500' },
  cancelled: { label: 'ملغي', icon: <XCircle className="w-4 h-4" />, color: 'bg-red-500' },
};

const MyOrders: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, total, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet>
        <title>طلباتي | حمودي ستور</title>
        <meta name="description" content="عرض جميع طلباتك في حمودي ستور" />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 md:w-10 md:h-10 gradient-primary rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
              </div>
              <h1 className="text-base md:text-lg font-bold">
                حمودي <span className="text-gradient">ستور</span>
              </h1>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="h-8 md:h-9 text-xs md:text-sm">
                <ArrowRight className="w-4 h-4 md:ml-2" />
                <span className="hidden sm:inline">العودة للمتجر</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6 md:mb-8">طلباتي</h1>

          {orders.length === 0 ? (
            <div className="text-center py-12 md:py-16">
              <ShoppingBag className="w-12 h-12 md:w-16 md:h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg md:text-xl font-bold mb-2">لا توجد طلبات</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-6">لم تقم بأي طلبات بعد</p>
              <Link to="/">
                <Button>تصفح المنتجات</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {orders.map((order) => (
                <Link 
                  key={order.id} 
                  to={`/track?q=${order.order_number}`}
                  className="block"
                >
                  <div className="bg-card rounded-xl border border-border p-3 md:p-4 hover:border-primary/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <div>
                        <p className="font-mono font-bold text-sm md:text-lg">{order.order_number}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {format(new Date(order.created_at), 'dd MMMM yyyy', { locale: ar })}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                        <Badge className={`${statusConfig[order.status].color} text-white text-xs`}>
                          {statusConfig[order.status].icon}
                          <span className="mr-1">{statusConfig[order.status].label}</span>
                        </Badge>
                        <p className="font-bold text-primary text-sm md:text-base">{order.total} ج.م</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyOrders;
