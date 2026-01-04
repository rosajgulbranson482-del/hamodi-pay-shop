import React, { useState } from 'react';
import { Bell, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface NotifyWhenAvailableProps {
  productId: string;
  productName: string;
  className?: string;
  variant?: 'default' | 'compact';
}

const NotifyWhenAvailable: React.FC<NotifyWhenAvailableProps> = ({ 
  productId, 
  productName,
  className,
  variant = 'default'
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email && !phone) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال البريد الإلكتروني أو رقم الهاتف",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('stock_notifications')
        .insert({
          product_id: productId,
          email: email || null,
          phone: phone || null,
          user_id: user?.id || null,
        });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "تم التسجيل بنجاح",
        description: `سنخبرك عندما يتوفر "${productName}" مرة أخرى`,
      });

      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setEmail('');
        setPhone('');
      }, 2000);
    } catch (error) {
      console.error('Error registering notification:', error);
      toast({
        title: "حدث خطأ",
        description: "لم نتمكن من تسجيل طلبك، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill from user profile if available
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && user) {
      setEmail(user.email || '');
      setPhone(profile?.phone || '');
    }
  };

  if (variant === 'compact') {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className={className}
          >
            <Bell className="w-4 h-4" />
            أعلمني
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">أعلمني عند التوفر</DialogTitle>
            <DialogDescription className="text-right">
              أدخل بياناتك وسنخبرك فور توفر "{productName}"
            </DialogDescription>
          </DialogHeader>
          
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-medium text-foreground">تم التسجيل بنجاح!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  البريد الإلكتروني
                </label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              
              <div className="text-center text-sm text-muted-foreground">أو</div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  رقم الهاتف
                </label>
                <Input
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التسجيل...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    أعلمني عند التوفر
                  </>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={className}
        >
          <Bell className="w-5 h-5" />
          أعلمني عند التوفر
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">أعلمني عند التوفر</DialogTitle>
          <DialogDescription className="text-right">
            أدخل بياناتك وسنخبرك فور توفر "{productName}"
          </DialogDescription>
        </DialogHeader>
        
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium text-foreground">تم التسجيل بنجاح!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                البريد الإلكتروني
              </label>
              <Input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
            
            <div className="text-center text-sm text-muted-foreground">أو</div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                رقم الهاتف
              </label>
              <Input
                type="tel"
                placeholder="01xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري التسجيل...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  أعلمني عند التوفر
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotifyWhenAvailable;
