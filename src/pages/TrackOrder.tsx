import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
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
  MapPin,
  Phone,
  Zap,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface TrackedOrder {
  id: string;
  order_number: string;
  governorate: string;
  delivery_fee: number;
  subtotal: number;
  discount_amount: number | null;
  total: number;
  status: OrderStatus;
  payment_method: string;
  payment_confirmed: boolean;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
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
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  // Check for query param on mount
  useEffect(() => {
    const query = searchParams.get('q');
    const phone = searchParams.get('p');
    if (query && phone && phone.length === 4) {
      setSearchQuery(query);
      setPhoneLast4(phone);
      searchOrder(query, phone);
    } else if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  const searchOrder = async (query: string, phone: string) => {
    if (!query.trim()) return;
    
    if (phone.length !== 4) {
      toast({ 
        title: "خطأ", 
        description: "يرجى إدخال آخر 4 أرقام من رقم الهاتف", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    setOrder(null);

    try {
      // Use edge function to securely fetch order with phone verification
      const { data, error } = await supabase.functions.invoke('track-order', {
        body: { orderNumber: query.trim(), phoneLast4: phone }
      });

      if (error) {
        console.error('Track order error:', error);
        toast({ 
          title: "خطأ", 
          description: "حدث خطأ في البحث عن الطلب", 
          variant: "destructive" 
        });
      } else if (data.error) {
        toast({ 
          title: "لم يتم العثور على الطلب", 
          description: data.error,
          variant: "destructive" 
        });
      } else if (data.order) {
        setOrder(data.order as TrackedOrder);
      }
    } catch (err) {
      console.error('Track order exception:', err);
      toast({ 
        title: "خطأ", 
        description: "حدث خطأ في الاتصال بالخادم", 
        variant: "destructive" 
      });
    }

    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    searchOrder(searchQuery, phoneLast4);
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
        <div className="max-w-2xl mx-auto">
          {/* Search Section */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">تتبع طلبك</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              أدخل رقم الطلب وآخر 4 أرقام من رقم الهاتف للتحقق
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-3 md:space-y-4 mb-6 md:mb-8">
            <div className="relative">
              <Package className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="رقم الطلب (مثال: HS-20260101-1234)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 text-sm md:text-base"
              />
            </div>
            <div className="flex gap-2 md:gap-3">
              <div className="relative flex-1">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="آخر 4 أرقام من الهاتف..."
                  value={phoneLast4}
                  onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="pr-10 text-sm md:text-base"
                  maxLength={4}
                  inputMode="numeric"
                  pattern="\d{4}"
                />
              </div>
              <Button type="submit" disabled={loading || !searchQuery.trim() || phoneLast4.length !== 4} className="px-4 md:px-6">
                {loading ? (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </Button>
            </div>
          </form>

          {/* Order Details */}
          {order && (
            <div className="space-y-4 md:space-y-6 animate-fade-in">
              {/* Order Header */}
              <div className="bg-card rounded-xl md:rounded-2xl border border-border p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 md:mb-4">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">رقم الطلب</p>
                    <p className="text-lg md:text-xl font-bold font-mono">{order.order_number}</p>
                  </div>
                  <Badge className={`${statusConfig[order.status].color} text-white px-2 md:px-3 py-1 self-start sm:self-auto`}>
                    {statusConfig[order.status].icon}
                    <span className="mr-1 md:mr-2 text-xs md:text-sm">{statusConfig[order.status].label}</span>
                  </Badge>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">
                  تم الطلب في {format(new Date(order.created_at), 'dd MMMM yyyy - hh:mm a', { locale: ar })}
                </p>
              </div>

              {/* Status Timeline */}
              {order.status !== 'cancelled' && (
                <div className="bg-card rounded-xl md:rounded-2xl border border-border p-4 md:p-6">
                  <h3 className="font-bold mb-4 md:mb-6 text-sm md:text-base">حالة الطلب</h3>
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute top-4 md:top-5 right-4 md:right-5 left-4 md:left-5 h-0.5 md:h-1 bg-muted rounded-full">
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
                              className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all ${
                                isCompleted 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted text-muted-foreground'
                              } ${isCurrent ? 'ring-2 md:ring-4 ring-primary/30' : ''}`}
                            >
                              <span className="[&>svg]:w-4 [&>svg]:h-4 md:[&>svg]:w-5 md:[&>svg]:h-5">
                                {statusConfig[status].icon}
                              </span>
                            </div>
                            <span className={`text-[10px] md:text-xs mt-1 md:mt-2 text-center max-w-[50px] md:max-w-none ${isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {statusConfig[status].label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Info */}
              <div className="bg-card rounded-xl border border-border p-3 md:p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1 md:mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs md:text-sm">التوصيل إلى</span>
                </div>
                <p className="font-medium text-sm md:text-base">{order.governorate}</p>
              </div>

              {/* Order Items */}
              <div className="bg-card rounded-xl md:rounded-2xl border border-border p-4 md:p-6">
                <h3 className="font-bold mb-3 md:mb-4 text-sm md:text-base">المنتجات</h3>
                <div className="space-y-2 md:space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2.5 md:p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium text-sm md:text-base">{item.product_name}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">الكمية: {item.quantity}</p>
                      </div>
                      <span className="font-bold text-sm md:text-base">{item.product_price * item.quantity} ج.م</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border mt-3 md:mt-4 pt-3 md:pt-4 space-y-1.5 md:space-y-2">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">المنتجات</span>
                    <span>{order.subtotal} ج.م</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">التوصيل</span>
                    <span>{order.delivery_fee} ج.م</span>
                  </div>
                  {order.discount_amount && order.discount_amount > 0 && (
                    <div className="flex justify-between text-xs md:text-sm text-green-600">
                      <span>الخصم</span>
                      <span>-{order.discount_amount} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base md:text-lg font-bold pt-2">
                    <span>الإجمالي</span>
                    <span className="text-primary">{order.total} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className={`rounded-xl p-3 md:p-4 ${order.payment_confirmed ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                <div className="flex items-center gap-2 md:gap-3">
                  {order.payment_confirmed ? (
                    <>
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-700 text-sm md:text-base">تم تأكيد الدفع</p>
                        <p className="text-xs md:text-sm text-green-600">شكراً لك! سيتم شحن طلبك قريباً</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-yellow-700 text-sm md:text-base">في انتظار تأكيد الدفع</p>
                        <p className="text-xs md:text-sm text-yellow-600">
                          {order.payment_method === 'cod' 
                            ? 'الدفع عند الاستلام' 
                            : 'يرجى التحويل على الرقم المحدد وانتظار التأكيد'}
                        </p>
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
