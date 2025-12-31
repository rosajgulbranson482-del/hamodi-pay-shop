import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Zap, Mail, Lock, Loader2 } from 'lucide-react';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const checkAdminRole = async (userId: string) => {
      const { data } = await supabase.rpc('has_role', { 
        _user_id: userId, 
        _role: 'admin' 
      });
      return data === true;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setTimeout(async () => {
          const isAdmin = await checkAdminRole(session.user.id);
          if (isAdmin) {
            navigate('/admin');
          } else {
            await supabase.auth.signOut();
            toast({
              title: "غير مصرح",
              description: "ليس لديك صلاحية الوصول للوحة التحكم",
              variant: "destructive",
            });
          }
          setCheckingAuth(false);
        }, 0);
      } else {
        setCheckingAuth(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const isAdmin = await checkAdminRole(session.user.id);
        if (isAdmin) {
          navigate('/admin');
        } else {
          await supabase.auth.signOut();
        }
      }
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;

      // Check if user has admin role
      const { data: isAdmin } = await supabase.rpc('has_role', { 
        _user_id: data.user.id, 
        _role: 'admin' 
      });

      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("ليس لديك صلاحية الوصول للوحة التحكم");
      }

      toast({ title: "تم تسجيل الدخول بنجاح" });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message === "Invalid login credentials" 
          ? "بيانات الدخول غير صحيحة" 
          : error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Helmet>
        <title>دخول المشرف | حمودي ستور</title>
        <meta
          name="description"
          content="تسجيل دخول المشرف لإدارة المنتجات والطلبات في حمودي ستور"
        />
        <link rel="canonical" href={`${window.location.origin}/auth`} />
      </Helmet>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            لوحة تحكم حمودي <span className="text-gradient">ستور</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            تسجيل الدخول للمشرفين
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                البريد الإلكتروني
              </Label>
              <Input
                type="email"
                placeholder="admin@hamoudi.store"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                كلمة المرور
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              تسجيل الدخول
            </Button>
          </form>
        </div>

        <div className="text-center mt-4">
          <a href="/" className="text-sm text-muted-foreground hover:text-primary">
            العودة للمتجر
          </a>
        </div>
      </div>
    </div>
  );
};

export default Auth;
