import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Send, Bell, Package, Mail, Phone, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface StockNotification {
  id: string;
  product_id: string;
  email: string | null;
  phone: string | null;
  notified: boolean;
  notified_at: string | null;
  created_at: string;
  product?: {
    id: string;
    name: string;
    image: string | null;
    in_stock: boolean;
    stock_count: number | null;
  };
}

const AdminStockNotifications: React.FC = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<StockNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    
    // First get all notifications
    const { data: notificationsData, error: notificationsError } = await supabase
      .from('stock_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (notificationsError) {
      toast({ title: "خطأ", description: notificationsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Get unique product IDs
    const productIds = [...new Set(notificationsData?.map(n => n.product_id) || [])];
    
    // Fetch products
    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, image, in_stock, stock_count')
      .in('id', productIds);

    // Merge products with notifications
    const notificationsWithProducts = (notificationsData || []).map(notification => ({
      ...notification,
      product: productsData?.find(p => p.id === notification.product_id)
    }));

    setNotifications(notificationsWithProducts);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    
    setDeleting(id);
    const { error } = await supabase
      .from('stock_notifications')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحذف", description: "تم حذف طلب الإشعار بنجاح" });
      fetchNotifications();
    }
    setDeleting(null);
  };

  const handleSendNotification = async (productId: string) => {
    setSending(productId);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-stock-notification', {
        body: { product_id: productId }
      });

      if (error) throw error;

      toast({ 
        title: "تم الإرسال", 
        description: `تم إرسال ${data.sent} إشعار بنجاح` 
      });
      fetchNotifications();
    } catch (error: any) {
      toast({ 
        title: "خطأ", 
        description: error.message || "فشل في إرسال الإشعارات", 
        variant: "destructive" 
      });
    }
    
    setSending(null);
  };

  const pendingNotifications = notifications.filter(n => !n.notified);
  const sentNotifications = notifications.filter(n => n.notified);

  // Group pending notifications by product
  const pendingByProduct = pendingNotifications.reduce((acc, notification) => {
    const productId = notification.product_id;
    if (!acc[productId]) {
      acc[productId] = {
        product: notification.product,
        notifications: []
      };
    }
    acc[productId].notifications.push(notification);
    return acc;
  }, {} as Record<string, { product: StockNotification['product']; notifications: StockNotification[] }>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bell className="w-5 h-5" />
          طلبات الإشعارات عند التوفر
        </h2>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            قيد الانتظار: {pendingNotifications.length}
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            تم الإرسال: {sentNotifications.length}
          </span>
        </div>
      </div>

      {/* Pending by Product */}
      {Object.keys(pendingByProduct).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">طلبات قيد الانتظار</h3>
          <div className="grid gap-4">
            {Object.entries(pendingByProduct).map(([productId, { product, notifications: productNotifications }]) => (
              <div key={productId} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {product?.image ? (
                      <img 
                        src={product.image} 
                        alt={product?.name} 
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold">{product?.name || 'منتج محذوف'}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {product?.in_stock && (product?.stock_count ?? 0) > 0 ? (
                          <Badge variant="default" className="bg-green-500">متوفر ({product.stock_count})</Badge>
                        ) : (
                          <Badge variant="destructive">نفذ المخزون</Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {productNotifications.length} طلب
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {product?.in_stock && (product?.stock_count ?? 0) > 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleSendNotification(productId)}
                      disabled={sending === productId}
                    >
                      {sending === productId ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      ) : (
                        <Send className="w-4 h-4 ml-2" />
                      )}
                      إرسال الإشعارات
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {productNotifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-4">
                        {notification.email && (
                          <span className="flex items-center gap-1 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            {notification.email}
                          </span>
                        )}
                        {notification.phone && (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            {notification.phone}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(notification.created_at), 'dd MMM yyyy - hh:mm a', { locale: ar })}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(notification.id)}
                        disabled={deleting === notification.id}
                      >
                        {deleting === notification.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent Notifications */}
      {sentNotifications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">إشعارات تم إرسالها</h3>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>البريد / الهاتف</TableHead>
                  <TableHead>تاريخ الطلب</TableHead>
                  <TableHead>تاريخ الإرسال</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentNotifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {notification.product?.image ? (
                          <img 
                            src={notification.product.image} 
                            alt={notification.product?.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium">{notification.product?.name || 'محذوف'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {notification.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3" />
                            {notification.email}
                          </div>
                        )}
                        {notification.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3" />
                            {notification.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(notification.created_at), 'dd/MM/yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle2 className="w-3 h-3 ml-1" />
                        {notification.notified_at && format(new Date(notification.notified_at), 'dd/MM/yyyy', { locale: ar })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(notification.id)}
                        disabled={deleting === notification.id}
                      >
                        {deleting === notification.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {notifications.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد طلبات إشعارات مسجلة</p>
        </div>
      )}
    </div>
  );
};

export default AdminStockNotifications;
