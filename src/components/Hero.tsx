import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Truck, Shield, CreditCard } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden gradient-hero text-primary-foreground py-16 md:py-24">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-72 h-72 bg-secondary rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary-foreground rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">أفضل العروض والمنتجات الأصلية</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-slide-up">
            مرحباً بك في
            <br />
            <span className="text-gradient">حمودي ستور</span>
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            اكتشف أحدث المنتجات الإلكترونية بأفضل الأسعار مع توصيل لجميع محافظات مصر
            ودفع آمن عبر فودافون كاش وانستا باي
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button variant="hero" size="xl" asChild>
              <a href="#products">تسوق الآن</a>
            </Button>
            <Button variant="outline" size="xl" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <a href="#about">اعرف أكثر</a>
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex flex-col items-center gap-2 p-4 bg-primary-foreground/5 backdrop-blur-sm rounded-xl">
              <Truck className="w-8 h-8 text-secondary" />
              <span className="text-sm font-medium">توصيل لكل مصر</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 bg-primary-foreground/5 backdrop-blur-sm rounded-xl">
              <CreditCard className="w-8 h-8 text-secondary" />
              <span className="text-sm font-medium">دفع آمن</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 bg-primary-foreground/5 backdrop-blur-sm rounded-xl">
              <Shield className="w-8 h-8 text-secondary" />
              <span className="text-sm font-medium">ضمان الجودة</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 bg-primary-foreground/5 backdrop-blur-sm rounded-xl">
              <Sparkles className="w-8 h-8 text-secondary" />
              <span className="text-sm font-medium">منتجات أصلية</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
