import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Zap, LogOut, Package, ShoppingBag, Bell, Loader2 } from 'lucide-react';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminProducts from '@/components/admin/AdminProducts';
import { Badge } from '@/components/ui/badge';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate('/auth');
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate('/auth');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Subscribe to new orders
  useEffect(() => {
    const channel = supabase
      .channel('new-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          setNewOrdersCount(prev => prev + 1);
          toast({
            title: "🔔 طلب جديد!",
            description: `تم استلام طلب جديد من ${payload.new.customer_name}`,
          });
          // Play notification sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">لوحة التحكم</h1>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {newOrdersCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-full">
                  <Bell className="w-4 h-4 text-destructive animate-pulse" />
                  <span className="text-sm font-medium text-destructive">{newOrdersCount} طلب جديد</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                <ShoppingBag className="w-4 h-4 ml-2" />
                المتجر
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 ml-2" />
                خروج
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="orders" className="space-y-6" onValueChange={() => setNewOrdersCount(0)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="orders" className="relative">
              <ShoppingBag className="w-4 h-4 ml-2" />
              الطلبات
              {newOrdersCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {newOrdersCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="w-4 h-4 ml-2" />
              المنتجات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <AdminOrders />
          </TabsContent>

          <TabsContent value="products">
            <AdminProducts />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
