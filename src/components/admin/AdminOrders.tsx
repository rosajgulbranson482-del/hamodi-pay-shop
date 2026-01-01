import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Eye, Loader2, RefreshCw, Check, Phone, MapPin, Mail, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string;
  governorate: string;
  delivery_fee: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  payment_method: string;
  payment_confirmed: boolean;
  notes: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  confirmed: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  processing: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  shipped: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  delivered: 'bg-green-500/10 text-green-600 border-green-500/30',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/30',
};

const statusLabels: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'تم التأكيد',
  processing: 'جاري التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

const AdminOrders: React.FC = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({});
  const [sendingEmail, setSendingEmail] = useState<Record<string, boolean>>({});

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setOrders((data || []) as Order[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to order changes
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrderItems = async (orderId: string) => {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (!error) {
      setOrderItems(data || []);
    }
    setLoadingItems(false);
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    // Find the order to get its email
    const order = orders.find(o => o.id === orderId);
    
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التحديث", description: "تم تحديث حالة الطلب بنجاح" });
      
      // Check if email is provided (either from input or saved in order) and send notification
      const email = emailInputs[orderId] ?? order?.customer_email;
      if (email && email.trim()) {
        await sendEmailNotification(orderId, status, email.trim());
      }
    }
  };

  const sendEmailNotification = async (orderId: string, status: string, email: string) => {
    setSendingEmail(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('send-order-notification', {
        body: { orderId, newStatus: status, customerEmail: email }
      });

      if (error) {
        console.error('Email notification error:', error);
        toast({ 
          title: "تنبيه", 
          description: "تم تحديث الحالة لكن فشل إرسال الإشعار بالبريد", 
          variant: "destructive" 
        });
      } else if (data?.error) {
        toast({ 
          title: "تنبيه", 
          description: data.error, 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "تم الإرسال", 
          description: "تم إرسال إشعار بالبريد الإلكتروني للعميل" 
        });
      }
    } catch (err) {
      console.error('Email notification exception:', err);
    }
    
    setSendingEmail(prev => ({ ...prev, [orderId]: false }));
  };

  const handleManualEmailSend = async (order: Order) => {
    const email = emailInputs[order.id] ?? order.customer_email;
    if (!email || !email.trim()) {
      toast({ 
        title: "خطأ", 
        description: "يرجى إدخال البريد الإلكتروني أولاً", 
        variant: "destructive" 
      });
      return;
    }
    await sendEmailNotification(order.id, order.status, email.trim());
  };

  const confirmPayment = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ payment_confirmed: true })
      .eq('id', orderId);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التأكيد", description: "تم تأكيد الدفع بنجاح" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">إدارة الطلبات</h2>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="w-4 h-4 ml-2" />
          تحديث
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          لا توجد طلبات بعد
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المحافظة</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الدفع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">
                    {order.order_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>{order.governorate}</TableCell>
                  <TableCell className="font-bold">{order.total} ج.م</TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value as OrderStatus)}
                    >
                      <SelectTrigger className="w-32">
                        <Badge className={statusColors[order.status]}>
                          {statusLabels[order.status]}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {order.payment_confirmed ? (
                      <Badge className="bg-green-500/10 text-green-600">
                        <Check className="w-3 h-3 ml-1" />
                        مؤكد
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmPayment(order.id)}
                      >
                        تأكيد الدفع
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'dd MMM yyyy', { locale: ar })}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedOrder(order);
                            fetchOrderItems(order.id);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg" dir="rtl">
                        <DialogHeader>
                          <DialogTitle>تفاصيل الطلب {selectedOrder?.order_number}</DialogTitle>
                        </DialogHeader>
                        
                        {selectedOrder && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> الهاتف
                                </p>
                                <p className="font-medium">{selectedOrder.customer_phone}</p>
                              </div>
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> المحافظة
                                </p>
                                <p className="font-medium">{selectedOrder.governorate}</p>
                              </div>
                            </div>

                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground mb-1">العنوان</p>
                              <p className="font-medium">{selectedOrder.customer_address}</p>
                            </div>

                            {selectedOrder.notes && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">ملاحظات</p>
                                <p className="font-medium">{selectedOrder.notes}</p>
                              </div>
                            )}

                            {/* Email Notification Section */}
                            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                              <Label className="text-sm flex items-center gap-1 mb-2">
                                <Mail className="w-3 h-3" /> إرسال إشعار للعميل
                              </Label>
                              {selectedOrder.customer_email && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  البريد المحفوظ: <span className="font-mono text-foreground">{selectedOrder.customer_email}</span>
                                </p>
                              )}
                              <div className="flex gap-2">
                                <Input
                                  type="email"
                                  placeholder={selectedOrder.customer_email || "البريد الإلكتروني للعميل..."}
                                  value={emailInputs[selectedOrder.id] ?? (selectedOrder.customer_email || '')}
                                  onChange={(e) => setEmailInputs(prev => ({ 
                                    ...prev, 
                                    [selectedOrder.id]: e.target.value 
                                  }))}
                                  className="flex-1"
                                  dir="ltr"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleManualEmailSend(selectedOrder)}
                                  disabled={sendingEmail[selectedOrder.id] || !(emailInputs[selectedOrder.id] ?? selectedOrder.customer_email)?.trim()}
                                >
                                  {sendingEmail[selectedOrder.id] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                سيتم إرسال إشعار تلقائي عند تغيير الحالة إذا كان البريد متوفراً
                              </p>
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="font-bold mb-3">المنتجات</h4>
                              {loadingItems ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                              ) : (
                                <div className="space-y-2">
                                  {orderItems.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                                      <span>{item.product_name} × {item.quantity}</span>
                                      <span className="font-medium">{item.product_price * item.quantity} ج.م</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="border-t pt-4 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>المنتجات</span>
                                <span>{selectedOrder.subtotal} ج.م</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>التوصيل</span>
                                <span>{selectedOrder.delivery_fee} ج.م</span>
                              </div>
                              <div className="flex justify-between font-bold text-lg">
                                <span>الإجمالي</span>
                                <span className="text-primary">{selectedOrder.total} ج.م</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
