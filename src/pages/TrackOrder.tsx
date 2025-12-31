import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Loader2, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  XCircle,
  Phone,
  MapPin,
  Zap,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  governorate: string;
  delivery_fee: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  payment_confirmed: boolean;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}

const statusConfig: Record<OrderStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { 
    label: 'قيد الانتظار', 
    icon: <Clock className="w-5 h-5" />, 
    color: 'bg-yellow-500' 
  },
  confirmed: { 
    label: 'تم التأكيد', 
    icon: <CheckCircle className="w-5 h-5" />, 
    color: 'bg-blue-500' 
  },
  processing: { 
    label: 'جاري التجهيز', 
    icon: <Package className="w-5 h-5" />, 
    color: 'bg-purple-500' 
  },
  shipped: { 
    label: 'تم الشحن', 
    icon: <Truck className="w-5 h-5" />, 
    color: 'bg-orange-500' 
  },
  delivered: { 
    label: 'تم التوصيل', 
    icon: <CheckCircle className="w-5 h-5" />, 
    color: 'bg-green-500' 
  },
  cancelled: { 
    label: 'ملغي', 
    icon: <XCircle className="w-5 h-5" />, 
    color: 'bg-red-500' 
  },
};

const statusSteps: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const TrackOrder: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setOrder(null);

    // Search by order number or phone
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .or(`order_number.eq.${searchQuery},customer_phone.eq.${searchQuery}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else if (!data) {
      toast({ 
        title: "لم يتم العثور على الطلب", 
        description: "تأكد من رقم الطلب أو رقم الهاتف",
        variant: "destructive" 
      });
    } else {
      setOrder(data as Order);
      // Fetch order items
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', data.id);
      setOrderItems(items || []);
    }
    setLoading(false);
  };

  const currentStepIndex = order ? statusSteps.indexOf(order.status) : -1;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet>
        <title>تتبع الطلب | حمودي ستور</title>
        <meta name="description" content="تتبع طلبك في حمودي ستور - اعرف حالة طلبك ومكانه الآن" />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold">
                حمودي <span className="text-gradient">ستور</span>
              </h1>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة للمتجر
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Search Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">تتبع طلبك</h1>
            <p className="text-muted-foreground">
              أدخل رقم الطلب أو رقم هاتفك لمعرفة حالة طلبك
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3 mb-8">
            <Input
              placeholder="رقم الطلب أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </Button>
          </form>

          {/* Order Details */}
          {order && (
            <div className="space-y-6 animate-fade-in">
              {/* Order Header */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الطلب</p>
                    <p className="text-xl font-bold font-mono">{order.order_number}</p>
                  </div>
                  <Badge className={`${statusConfig[order.status].color} text-white px-3 py-1`}>
                    {statusConfig[order.status].icon}
                    <span className="mr-2">{statusConfig[order.status].label}</span>
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  تم الطلب في {format(new Date(order.created_at), 'dd MMMM yyyy - hh:mm a', { locale: ar })}
                </p>
              </div>

              {/* Status Timeline */}
              {order.status !== 'cancelled' && (
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-bold mb-6">حالة الطلب</h3>
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute top-5 right-5 left-5 h-1 bg-muted rounded-full">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
                      />
                    </div>
                    
                    {/* Steps */}
                    <div className="relative flex justify-between">
                      {statusSteps.map((status, index) => {
                        const isCompleted = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        return (
                          <div key={status} className="flex flex-col items-center">
                            <div 
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                isCompleted 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted text-muted-foreground'
                              } ${isCurrent ? 'ring-4 ring-primary/30' : ''}`}
                            >
                              {statusConfig[status].icon}
                            </div>
                            <span className={`text-xs mt-2 text-center ${isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {statusConfig[status].label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Order Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">رقم الهاتف</span>
                  </div>
                  <p className="font-medium">{order.customer_phone}</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">التوصيل إلى</span>
                  </div>
                  <p className="font-medium">{order.governorate}</p>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-bold mb-4">المنتجات</h3>
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">الكمية: {item.quantity}</p>
                      </div>
                      <span className="font-bold">{item.product_price * item.quantity} ج.م</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border mt-4 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">المنتجات</span>
                    <span>{order.subtotal} ج.م</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">التوصيل</span>
                    <span>{order.delivery_fee} ج.م</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2">
                    <span>الإجمالي</span>
                    <span className="text-primary">{order.total} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className={`rounded-xl p-4 ${order.payment_confirmed ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                <div className="flex items-center gap-3">
                  {order.payment_confirmed ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-700">تم تأكيد الدفع</p>
                        <p className="text-sm text-green-600">شكراً لك! سيتم شحن طلبك قريباً</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Clock className="w-6 h-6 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-700">في انتظار تأكيد الدفع</p>
                        <p className="text-sm text-yellow-600">يرجى التحويل على الرقم المحدد وانتظار التأكيد</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TrackOrder;
