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
import { Eye, Loader2, RefreshCw, Check, Phone, MapPin, Mail, Send, MessageCircle, CreditCard, Download, Filter, X, Calendar, Search, Printer, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import * as XLSX from 'xlsx';
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
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
  product_id: string | null;
  product_image: string | null;
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

const statusMessages: Record<OrderStatus, string> = {
  pending: 'طلبك قيد المراجعة وسيتم التأكيد قريباً',
  confirmed: 'تم تأكيد طلبك وجاري التجهيز',
  processing: 'جاري تجهيز طلبك للشحن',
  shipped: 'تم شحن طلبك وفي الطريق إليك! 🚚',
  delivered: 'تم توصيل طلبك بنجاح! شكراً لتسوقك معنا 🎉',
  cancelled: 'نأسف، تم إلغاء طلبك. تواصل معنا لأي استفسار',
};

const ORDERS_PER_PAGE = 20;

const AdminOrders: React.FC = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({});
  const [sendingEmail, setSendingEmail] = useState<Record<string, boolean>>({});
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesName = order.customer_name.toLowerCase().includes(query);
      const matchesPhone = order.customer_phone.includes(query);
      const matchesOrderNumber = order.order_number.toLowerCase().includes(query);
      if (!matchesName && !matchesPhone && !matchesOrderNumber) {
        return false;
      }
    }
    
    // Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.created_at);
      const today = new Date();
      
      switch (dateFilter) {
        case 'today':
          if (orderDate < startOfDay(today) || orderDate > endOfDay(today)) return false;
          break;
        case 'yesterday':
          const yesterday = subDays(today, 1);
          if (orderDate < startOfDay(yesterday) || orderDate > endOfDay(yesterday)) return false;
          break;
        case 'week':
          if (orderDate < startOfDay(subDays(today, 7))) return false;
          break;
        case 'month':
          if (orderDate < startOfDay(subDays(today, 30))) return false;
          break;
        case 'custom':
          if (customDateFrom && customDateTo) {
            const from = startOfDay(new Date(customDateFrom));
            const to = endOfDay(new Date(customDateTo));
            if (!isWithinInterval(orderDate, { start: from, end: to })) return false;
          }
          break;
      }
    }
    
    return true;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all' || dateFilter !== 'all';
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );
  
  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter, customDateFrom, customDateTo]);

  const printInvoice = (order: Order, items: OrderItem[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'خطأ',
        description: 'تعذر فتح نافذة الطباعة، يرجى السماح بالنوافذ المنبثقة',
        variant: 'destructive',
      });
      return;
    }

    const invoiceHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ${order.order_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
            padding: 20px; 
            background: #fff;
            color: #333;
          }
          .invoice { max-width: 800px; margin: 0 auto; }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #7c3aed; 
            padding-bottom: 20px; 
            margin-bottom: 20px; 
          }
          .header h1 { color: #7c3aed; font-size: 28px; margin-bottom: 5px; }
          .header p { color: #666; font-size: 14px; }
          .invoice-info { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 20px;
            background: #f8f8f8;
            padding: 15px;
            border-radius: 8px;
          }
          .invoice-info div { }
          .invoice-info h3 { color: #7c3aed; font-size: 14px; margin-bottom: 5px; }
          .invoice-info p { font-size: 14px; }
          .customer-info { 
            background: #f8f8f8; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
          }
          .customer-info h3 { 
            color: #7c3aed; 
            margin-bottom: 10px; 
            font-size: 16px;
          }
          .customer-info p { margin-bottom: 5px; font-size: 14px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th { 
            background: #7c3aed; 
            color: white; 
            padding: 12px; 
            text-align: right;
            font-size: 14px;
          }
          .items-table td { 
            padding: 12px; 
            border-bottom: 1px solid #eee;
            font-size: 14px;
          }
          .items-table tr:nth-child(even) { background: #f8f8f8; }
          .totals { 
            margin-top: 20px; 
            text-align: left;
            background: #f8f8f8;
            padding: 15px;
            border-radius: 8px;
          }
          .totals div { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0;
            font-size: 14px;
          }
          .totals .total { 
            font-size: 18px; 
            font-weight: bold; 
            color: #7c3aed;
            border-top: 2px solid #7c3aed;
            margin-top: 10px;
            padding-top: 15px;
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 12px;
          }
          .status { 
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
          }
          .status-pending { background: #fef3c7; color: #d97706; }
          .status-confirmed { background: #dbeafe; color: #2563eb; }
          .status-processing { background: #ede9fe; color: #7c3aed; }
          .status-shipped { background: #ffedd5; color: #ea580c; }
          .status-delivered { background: #dcfce7; color: #16a34a; }
          .status-cancelled { background: #fee2e2; color: #dc2626; }
          @media print {
            body { padding: 0; }
            .invoice { max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <h1>⚡ حمودي ستور</h1>
            <p>فاتورة طلب</p>
          </div>
          
          <div class="invoice-info">
            <div>
              <h3>رقم الطلب</h3>
              <p><strong>${order.order_number}</strong></p>
            </div>
            <div>
              <h3>التاريخ</h3>
              <p>${format(new Date(order.created_at), 'dd/MM/yyyy - HH:mm', { locale: ar })}</p>
            </div>
            <div>
              <h3>الحالة</h3>
              <p><span class="status status-${order.status}">${statusLabels[order.status]}</span></p>
            </div>
            <div>
              <h3>طريقة الدفع</h3>
              <p>${order.payment_method === 'cash_on_delivery' ? 'كاش عند الاستلام' : 'فودافون كاش'}</p>
            </div>
          </div>
          
          <div class="customer-info">
            <h3>بيانات العميل</h3>
            <p><strong>الاسم:</strong> ${order.customer_name}</p>
            <p><strong>الهاتف:</strong> ${order.customer_phone}</p>
            <p><strong>المحافظة:</strong> ${order.governorate}</p>
            <p><strong>العنوان:</strong> ${order.customer_address}</p>
            ${order.notes ? `<p><strong>ملاحظات:</strong> ${order.notes}</p>` : ''}
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.product_name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.product_price} ج.م</td>
                  <td>${item.product_price * item.quantity} ج.م</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div>
              <span>المنتجات:</span>
              <span>${order.subtotal} ج.م</span>
            </div>
            <div>
              <span>التوصيل:</span>
              <span>${order.delivery_fee} ج.م</span>
            </div>
            <div class="total">
              <span>الإجمالي:</span>
              <span>${order.total} ج.م</span>
            </div>
          </div>
          
          <div class="footer">
            <p>شكراً لتسوقك من حمودي ستور ⚡</p>
            <p>للاستفسارات: تواصل معنا عبر واتساب</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  const exportToExcel = () => {
    const exportData = filteredOrders.map(order => ({
      'رقم الطلب': order.order_number,
      'اسم العميل': order.customer_name,
      'رقم الهاتف': order.customer_phone,
      'البريد الإلكتروني': order.customer_email || '-',
      'المحافظة': order.governorate,
      'العنوان': order.customer_address,
      'المنتجات': order.subtotal,
      'التوصيل': order.delivery_fee,
      'الإجمالي': order.total,
      'طريقة الدفع': order.payment_method === 'cash_on_delivery' ? 'كاش عند الاستلام' : 'فودافون كاش / انستا باي',
      'تأكيد الدفع': order.payment_confirmed ? 'نعم' : 'لا',
      'الحالة': statusLabels[order.status],
      'ملاحظات': order.notes || '-',
      'تاريخ الطلب': format(new Date(order.created_at), 'yyyy/MM/dd HH:mm', { locale: ar }),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الطلبات');
    
    // Auto-size columns
    const maxWidth = 30;
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...exportData.map(row => String(row[key as keyof typeof row] || '').length)))
    }));
    worksheet['!cols'] = colWidths;

    const fileName = `طلبات_حمودي_ستور_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: 'تم التصدير بنجاح',
      description: `تم تصدير ${filteredOrders.length} طلب إلى ملف Excel`,
    });
  };

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
      .select('*, products:product_id(image)')
      .eq('order_id', orderId);

    if (!error && data) {
      const itemsWithImages = data.map((item: any) => ({
        id: item.id,
        product_name: item.product_name,
        product_price: item.product_price,
        quantity: item.quantity,
        product_id: item.product_id,
        product_image: item.products?.image || null,
      }));
      setOrderItems(itemsWithImages);
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

      // Show WhatsApp notification option
      if (order?.customer_phone) {
        const whatsappUrl = generateWhatsAppUrl(order, status);
        toast({
          title: "إرسال إشعار واتساب؟",
          description: (
            <div className="flex gap-2 mt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                إرسال واتساب
              </a>
            </div>
          ),
          duration: 10000,
        });
      }
    }
  };

  const generateWhatsAppUrl = (order: Order, status: OrderStatus) => {
    const statusLabel = statusLabels[status];
    const statusMessage = statusMessages[status];
    
    const message = `⚡ *حمودي ستور*

مرحباً ${order.customer_name}! 👋

📦 *تحديث حالة طلبك*
رقم الطلب: ${order.order_number}

✨ *الحالة الجديدة:* ${statusLabel}

${statusMessage}

الإجمالي: ${order.total} ج.م
التوصيل إلى: ${order.governorate}

شكراً لثقتك في حمودي ستور! 💜`;

    // Format phone number for WhatsApp (remove leading 0 and add Egypt code)
    let phone = order.customer_phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '2' + phone;
    } else if (!phone.startsWith('20')) {
      phone = '20' + phone;
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
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

  const deleteOrder = async (orderId: string) => {
    // First delete order items
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (itemsError) {
      toast({ title: "خطأ", description: itemsError.message, variant: "destructive" });
      return;
    }

    // Then delete the order
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحذف", description: "تم حذف الطلب بنجاح" });
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">إدارة الطلبات</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={filteredOrders.length === 0}>
            <Download className="w-4 h-4 ml-2" />
            تصدير Excel
          </Button>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم، رقم الطلب، أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pr-9"
          />
        </div>

        <div className="h-6 w-px bg-border hidden sm:block" />
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">فلترة:</span>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="pending">قيد الانتظار</SelectItem>
            <SelectItem value="confirmed">تم التأكيد</SelectItem>
            <SelectItem value="processing">جاري التجهيز</SelectItem>
            <SelectItem value="shipped">تم الشحن</SelectItem>
            <SelectItem value="delivered">تم التوصيل</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="التاريخ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأوقات</SelectItem>
            <SelectItem value="today">اليوم</SelectItem>
            <SelectItem value="yesterday">أمس</SelectItem>
            <SelectItem value="week">آخر أسبوع</SelectItem>
            <SelectItem value="month">آخر شهر</SelectItem>
            <SelectItem value="custom">تحديد فترة</SelectItem>
          </SelectContent>
        </Select>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="h-9 w-[130px]"
              />
            </div>
            <span className="text-muted-foreground">إلى</span>
            <Input
              type="date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="h-9 w-[130px]"
            />
          </div>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            <X className="w-4 h-4 ml-1" />
            مسح الفلاتر
          </Button>
        )}

        <div className="mr-auto text-sm text-muted-foreground">
          عرض {paginatedOrders.length} من {filteredOrders.length} طلب
          {filteredOrders.length !== orders.length && ` (من إجمالي ${orders.length})`}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {orders.length === 0 ? 'لا توجد طلبات بعد' : 'لا توجد طلبات تطابق الفلاتر المحددة'}
        </div>
      ) : (
        <>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المحافظة</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>طريقة الدفع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الدفع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => (
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
                    <Badge variant="outline" className={
                      order.payment_method === 'cash_on_delivery' 
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' 
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                    }>
                      {order.payment_method === 'cash_on_delivery' ? 'كاش عند الاستلام' : 'فودافون كاش / انستا باي'}
                    </Badge>
                  </TableCell>
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
                    <div className="flex items-center gap-1">
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
                              <div className="p-3 bg-muted rounded-lg col-span-2">
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" /> طريقة الدفع
                                </p>
                                <p className="font-medium">
                                  {selectedOrder.payment_method === 'cash_on_delivery' ? 'كاش عند الاستلام' : 'فودافون كاش / انستا باي'}
                                </p>
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

                            {/* WhatsApp Notification Section */}
                            <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                              <Label className="text-sm flex items-center gap-1 mb-2">
                                <MessageCircle className="w-3 h-3 text-green-600" /> إرسال واتساب (مجاني)
                              </Label>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  onClick={() => {
                                    const url = generateWhatsAppUrl(selectedOrder, selectedOrder.status);
                                    window.open(url, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                  size="sm"
                                >
                                  <MessageCircle className="w-4 h-4 ml-2" />
                                  فتح واتساب
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const url = generateWhatsAppUrl(selectedOrder, selectedOrder.status);
                                    navigator.clipboard.writeText(url);
                                    toast({
                                      title: "تم نسخ الرابط",
                                      description: "الصق الرابط في متصفح جديد لفتح واتساب",
                                    });
                                  }}
                                >
                                  نسخ الرابط
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                إذا لم يعمل الزر، انسخ الرابط والصقه في متصفح جديد
                              </p>
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="font-bold mb-3">المنتجات</h4>
                              {loadingItems ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                              ) : (
                                <div className="space-y-2">
                                  {orderItems.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                                      {item.product_image ? (
                                        <img 
                                          src={item.product_image} 
                                          alt={item.product_name}
                                          className="w-12 h-12 object-cover rounded-lg border border-border"
                                        />
                                      ) : (
                                        <div className="w-12 h-12 bg-muted-foreground/10 rounded-lg flex items-center justify-center">
                                          <span className="text-xs text-muted-foreground">لا صورة</span>
                                        </div>
                                      )}
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{item.product_name}</p>
                                        <p className="text-xs text-muted-foreground">الكمية: {item.quantity}</p>
                                      </div>
                                      <span className="font-bold text-primary">{item.product_price * item.quantity} ج.م</span>
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

                            {/* Print Button */}
                            <div className="border-t pt-4">
                              <Button 
                                onClick={() => printInvoice(selectedOrder, orderItems)}
                                className="w-full"
                                disabled={loadingItems || orderItems.length === 0}
                              >
                                <Printer className="w-4 h-4 ml-2" />
                                طباعة الفاتورة
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف الطلب</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف الطلب رقم {order.order_number}؟ لا يمكن التراجع عن هذا الإجراء.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteOrder(order.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              السابق
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-9 h-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              التالي
            </Button>
          </div>
        )}
      </>
      )}
    </div>
  );
};

export default AdminOrders;
