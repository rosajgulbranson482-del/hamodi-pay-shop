import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, ShoppingCart, DollarSign, Package, Users, 
  Calendar, CheckCircle, Clock, XCircle, Truck
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
  governorate: string;
  payment_method: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  product_price: number;
}

const AdminStats: React.FC = () => {
  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-stats-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Order[];
    },
  });

  // Fetch order items for top products
  const { data: orderItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['admin-stats-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*');
      
      if (error) throw error;
      return data as OrderItem[];
    },
  });

  // Calculate statistics
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Daily revenue for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startOfDay(date) && orderDate <= endOfDay(date);
    });
    return {
      date: format(date, 'EEE', { locale: ar }),
      fullDate: format(date, 'dd/MM', { locale: ar }),
      revenue: dayOrders.reduce((sum, o) => sum + Number(o.total), 0),
      orders: dayOrders.length,
    };
  });

  // Status distribution
  const statusData = [
    { name: 'قيد الانتظار', value: orders.filter(o => o.status === 'pending').length, color: 'hsl(var(--chart-1))' },
    { name: 'مؤكد', value: orders.filter(o => o.status === 'confirmed').length, color: 'hsl(var(--chart-2))' },
    { name: 'قيد التجهيز', value: orders.filter(o => o.status === 'processing').length, color: 'hsl(var(--chart-3))' },
    { name: 'تم الشحن', value: orders.filter(o => o.status === 'shipped').length, color: 'hsl(var(--chart-4))' },
    { name: 'تم التوصيل', value: orders.filter(o => o.status === 'delivered').length, color: 'hsl(var(--chart-5))' },
    { name: 'ملغي', value: orders.filter(o => o.status === 'cancelled').length, color: 'hsl(var(--destructive))' },
  ].filter(item => item.value > 0);

  // Top governorates
  const governorateStats = orders.reduce((acc, order) => {
    acc[order.governorate] = (acc[order.governorate] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topGovernorates = Object.entries(governorateStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Top products
  const productStats = orderItems.reduce((acc, item) => {
    acc[item.product_name] = (acc[item.product_name] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);

  const topProducts = Object.entries(productStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, quantity]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, quantity }));

  // Payment methods
  const paymentData = [
    { 
      name: 'كاش عند الاستلام', 
      value: orders.filter(o => o.payment_method === 'cash_on_delivery').length,
      color: 'hsl(var(--chart-1))'
    },
    { 
      name: 'فودافون كاش', 
      value: orders.filter(o => o.payment_method === 'vodafone_cash').length,
      color: 'hsl(var(--chart-2))'
    },
  ].filter(item => item.value > 0);

  if (ordersLoading || itemsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
                <p className="text-xl md:text-2xl font-bold text-primary">
                  {totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">ج.م</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
                <p className="text-xl md:text-2xl font-bold text-blue-600">
                  {totalOrders}
                </p>
                <p className="text-xs text-muted-foreground">طلب</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">تم التوصيل</p>
                <p className="text-xl md:text-2xl font-bold text-green-600">
                  {deliveredOrders}
                </p>
                <p className="text-xs text-muted-foreground">طلب</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">متوسط الطلب</p>
                <p className="text-xl md:text-2xl font-bold text-amber-600">
                  {Math.round(avgOrderValue).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">ج.م</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-3 md:p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">قيد الانتظار</p>
              <p className="text-lg font-bold">{pendingOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Truck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">قيد الشحن</p>
              <p className="text-lg font-bold">{orders.filter(o => o.status === 'shipped').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ملغي</p>
              <p className="text-lg font-bold">{cancelledOrders}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              الإيرادات - آخر 7 أيام
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last7Days}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      direction: 'rtl'
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} ج.م`, 'الإيرادات']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              عدد الطلبات - آخر 7 أيام
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7Days}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      direction: 'rtl'
                    }}
                    formatter={(value: number) => [`${value} طلب`, 'الطلبات']}
                  />
                  <Bar 
                    dataKey="orders" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">توزيع حالات الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      direction: 'rtl'
                    }}
                    formatter={(value: number) => [`${value} طلب`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {statusData.map((item, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs"
                  style={{ borderColor: item.color, color: item.color }}
                >
                  {item.name}: {item.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Governorates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">أكثر المحافظات طلباً</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topGovernorates.length > 0 ? (
                topGovernorates.map((gov, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      <span className="text-sm">{gov.name}</span>
                    </div>
                    <Badge variant="secondary">{gov.count} طلب</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">المنتجات الأكثر مبيعاً</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      <span className="text-sm truncate max-w-[120px]">{product.name}</span>
                    </div>
                    <Badge variant="secondary">{product.quantity} قطعة</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      {paymentData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">طرق الدفع المستخدمة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 justify-center">
              {paymentData.map((method, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50"
                >
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: method.color }}
                  />
                  <span className="text-sm">{method.name}</span>
                  <Badge>{method.value} طلب</Badge>
                  <span className="text-xs text-muted-foreground">
                    ({totalOrders > 0 ? Math.round((method.value / totalOrders) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminStats;
