import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Users, Globe, Clock, Eye, TrendingUp, MapPin, Trash2 } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { toast } from 'sonner';
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

interface PageView {
  id: string;
  session_id: string;
  page_path: string;
  product_id: string | null;
  country: string | null;
  city: string | null;
  time_spent_seconds: number;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  image: string | null;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const AdminVisitors: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete all page views
  const handleDeleteAllViews = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('page_views')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['admin-page-views'] });
      toast.success('تم حذف جميع سجلات الزوار بنجاح');
    } catch (error) {
      console.error('Error deleting page views:', error);
      toast.error('حدث خطأ أثناء حذف السجلات');
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch page views
  const { data: pageViews, isLoading: loadingViews } = useQuery({
    queryKey: ['admin-page-views'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_views')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);
      
      if (error) throw error;
      return data as PageView[];
    },
    staleTime: 30000
  });

  // Fetch products for names
  const { data: products } = useQuery({
    queryKey: ['admin-products-for-views'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image');
      
      if (error) throw error;
      return data as Product[];
    },
    staleTime: 60000
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!pageViews) return null;

    const uniqueSessions = new Set(pageViews.map(v => v.session_id)).size;
    const totalViews = pageViews.length;
    const avgTimeSpent = pageViews.reduce((acc, v) => acc + (v.time_spent_seconds || 0), 0) / totalViews || 0;
    
    // Today's visitors
    const today = new Date().toDateString();
    const todayViews = pageViews.filter(v => new Date(v.created_at).toDateString() === today);
    const todayUniqueSessions = new Set(todayViews.map(v => v.session_id)).size;

    return {
      uniqueSessions,
      totalViews,
      avgTimeSpent: Math.round(avgTimeSpent),
      todayVisitors: todayUniqueSessions
    };
  }, [pageViews]);

  // Country distribution
  const countryData = useMemo(() => {
    if (!pageViews) return [];
    
    const countryMap = new Map<string, number>();
    pageViews.forEach(v => {
      const country = v.country || 'غير معروف';
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    });

    return Array.from(countryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [pageViews]);

  // City distribution (for Egypt)
  const cityData = useMemo(() => {
    if (!pageViews) return [];
    
    const cityMap = new Map<string, number>();
    pageViews.forEach(v => {
      if (v.city && v.city !== 'Unknown') {
        cityMap.set(v.city, (cityMap.get(v.city) || 0) + 1);
      }
    });

    return Array.from(cityMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [pageViews]);

  // Most viewed products
  const topProducts = useMemo(() => {
    if (!pageViews || !products) return [];
    
    const productMap = new Map<string, number>();
    pageViews.forEach(v => {
      if (v.product_id) {
        productMap.set(v.product_id, (productMap.get(v.product_id) || 0) + 1);
      }
    });

    return Array.from(productMap.entries())
      .map(([productId, views]) => {
        const product = products.find(p => p.id === productId);
        return {
          id: productId,
          name: product?.name || 'منتج محذوف',
          image: product?.image,
          views
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }, [pageViews, products]);

  // Views over last 7 days
  const dailyViews = useMemo(() => {
    if (!pageViews) return [];
    
    const days: { date: string; views: number; visitors: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      
      const dayViews = pageViews.filter(v => new Date(v.created_at).toDateString() === dateStr);
      const uniqueVisitors = new Set(dayViews.map(v => v.session_id)).size;
      
      days.push({
        date: date.toLocaleDateString('ar-EG', { weekday: 'short', month: 'short', day: 'numeric' }),
        views: dayViews.length,
        visitors: uniqueVisitors
      });
    }
    
    return days;
  }, [pageViews]);

  // Most visited pages
  const topPages = useMemo(() => {
    if (!pageViews) return [];
    
    const pageMap = new Map<string, number>();
    pageViews.forEach(v => {
      const path = v.page_path.startsWith('/product/') ? '/product/[id]' : v.page_path;
      pageMap.set(path, (pageMap.get(path) || 0) + 1);
    });

    const pageNames: Record<string, string> = {
      '/': 'الصفحة الرئيسية',
      '/product/[id]': 'صفحات المنتجات',
      '/checkout': 'صفحة الدفع',
      '/favorites': 'المفضلة',
      '/my-orders': 'طلباتي',
      '/track-order': 'تتبع الطلب',
      '/auth': 'تسجيل الدخول',
      '/account-settings': 'إعدادات الحساب'
    };

    return Array.from(pageMap.entries())
      .map(([path, views]) => ({
        path,
        name: pageNames[path] || path,
        views
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);
  }, [pageViews]);

  if (loadingViews) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-80" />)}
        </div>
      </div>
    );
  }

  const chartConfig = {
    views: { label: 'المشاهدات', color: 'hsl(var(--primary))' },
    visitors: { label: 'الزوار', color: 'hsl(var(--chart-2))' }
  };

  return (
    <div className="space-y-6">
      {/* Header with Delete Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">إحصائيات الزوار</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              size="sm"
              disabled={isDeleting || !pageViews?.length}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف جميع السجلات
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف جميع سجلات الزوار والإحصائيات نهائياً. هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAllViews}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'جاري الحذف...' : 'حذف الكل'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-900">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-blue-500/20 rounded-xl">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">إجمالي الزوار</p>
                <p className="text-xl md:text-2xl font-bold">{stats?.uniqueSessions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-900">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-green-500/20 rounded-xl">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">زوار اليوم</p>
                <p className="text-xl md:text-2xl font-bold">{stats?.todayVisitors.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200 dark:border-amber-900">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-amber-500/20 rounded-xl">
                <Eye className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">إجمالي المشاهدات</p>
                <p className="text-xl md:text-2xl font-bold">{stats?.totalViews.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-900">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-purple-500/20 rounded-xl">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">متوسط الوقت</p>
                <p className="text-xl md:text-2xl font-bold">{stats?.avgTimeSpent}ث</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Views Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              الزيارات خلال 7 أيام
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <AreaChart data={dailyViews}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area 
                  type="monotone" 
                  dataKey="visitors" 
                  stroke="hsl(var(--chart-2))" 
                  fill="hsl(var(--chart-2))" 
                  fillOpacity={0.3}
                  name="الزوار"
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.2}
                  name="المشاهدات"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Country Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              الزوار حسب الدولة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <PieChart>
                <Pie
                  data={countryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {countryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'زيارة']}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Cities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              أكثر المدن زيارة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cityData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={cityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" className="text-xs" width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="زيارات" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                لا توجد بيانات كافية
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              أكثر الصفحات زيارة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPages.map((page, index) => (
                <div key={page.path} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">{page.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{page.views.toLocaleString()} مشاهدة</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Viewed Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            أكثر المنتجات مشاهدة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {topProducts.map((product, index) => (
                <div key={product.id} className="relative p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  {product.image && (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-24 object-contain rounded-lg mb-2"
                    />
                  )}
                  <p className="text-sm font-medium line-clamp-2">{product.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{product.views.toLocaleString()} مشاهدة</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد بيانات عن مشاهدات المنتجات بعد
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminVisitors;
