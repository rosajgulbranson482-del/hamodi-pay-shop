import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Truck, Shield, CreditCard } from 'lucide-react';
import PromoBanner from '@/components/PromoBanner';

const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden gradient-hero text-primary-foreground py-10 md:py-24">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-48 md:w-72 h-48 md:h-72 bg-secondary rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-64 md:w-96 h-64 md:h-96 bg-primary-foreground rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full mb-4 md:mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-secondary" />
            <span className="text-xs md:text-sm font-medium">أفضل العروض والمنتجات الأصلية</span>
          </div>

          <h1 className="text-3xl md:text-6xl font-bold mb-4 md:mb-6 animate-slide-up">
            مرحباً بك في
            <br />
            <span className="text-gradient">حمودي ستور</span>
          </h1>

          {/* Promo Banner */}
          <div className="mb-4 md:mb-6 animate-slide-up rounded-xl overflow-hidden" style={{ animationDelay: '0.05s' }}>
            <PromoBanner />
          </div>

          <p className="text-sm md:text-xl text-primary-foreground/80 mb-6 md:mb-8 max-w-2xl mx-auto px-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            اكتشف أحدث المنتجات الإلكترونية بأفضل الأسعار مع توصيل لجميع محافظات مصر
          </p>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-8 md:mb-12 animate-slide-up px-4" style={{ animationDelay: '0.2s' }}>
            <Button variant="hero" size="lg" className="md:text-lg" asChild>
              <a href="#products">تسوق الآن</a>
            </Button>
            <Button variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground md:text-lg">
              <a href="#about">اعرف أكثر</a>
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-6 animate-slide-up px-2" style={{ animationDelay: '0.3s' }}>
            <div className="flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 bg-primary-foreground/5 backdrop-blur-sm rounded-xl">
              <Truck className="w-6 h-6 md:w-8 md:h-8 text-secondary" />
              <span className="text-xs md:text-sm font-medium">توصيل لكل مصر</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 bg-primary-foreground/5 backdrop-blur-sm rounded-xl">
              <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-secondary" />
              <span className="text-xs md:text-sm font-medium">دفع آمن</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 bg-primary-foreground/5 backdrop-blur-sm rounded-xl">
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-secondary" />
              <span className="text-xs md:text-sm font-medium">ضمان الجودة</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 bg-primary-foreground/5 backdrop-blur-sm rounded-xl">
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-secondary" />
              <span className="text-xs md:text-sm font-medium">منتجات أصلية</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
