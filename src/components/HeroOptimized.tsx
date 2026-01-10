import React, { memo, Suspense, lazy } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Truck, Shield, CreditCard } from 'lucide-react';

// Lazy load banners - they make API calls
const FreeDeliveryBanner = lazy(() => import('@/components/FreeDeliveryBannerOptimized'));
const PromoBanner = lazy(() => import('@/components/PromoBannerOptimized'));

const features = [
  { icon: Truck, label: 'توصيل لكل مصر' },
  { icon: CreditCard, label: 'دفع آمن' },
  { icon: Shield, label: 'ضمان الجودة' },
  { icon: Sparkles, label: 'منتجات أصلية' },
];

const HeroOptimized: React.FC = memo(() => {
  return (
    <>
      {/* Free Delivery Banner - Lazy loaded */}
      <Suspense fallback={null}>
        <FreeDeliveryBanner />
      </Suspense>
      
      <section className="relative overflow-hidden gradient-hero text-primary-foreground py-10 md:py-24">
        {/* Simplified background - removed heavy blur effects */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-48 md:w-72 h-48 md:h-72 bg-secondary rounded-full" />
          <div className="absolute bottom-10 left-10 w-64 md:w-96 h-64 md:h-96 bg-primary-foreground rounded-full" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full mb-4 md:mb-6">
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-secondary" />
              <span className="text-xs md:text-sm font-medium">أفضل العروض والمنتجات الأصلية</span>
            </div>

            <h1 className="text-3xl md:text-6xl font-bold mb-4 md:mb-6">
              مرحباً بك في
              <br />
              <span className="text-gradient">حمودي ستور</span>
            </h1>

            {/* Promo Banner - Lazy loaded */}
            <div className="mb-4 md:mb-6 rounded-xl overflow-hidden">
              <Suspense fallback={null}>
                <PromoBanner />
              </Suspense>
            </div>

            <p className="text-sm md:text-xl text-primary-foreground/80 mb-6 md:mb-8 max-w-2xl mx-auto px-2">
              اكتشف أحدث المنتجات الإلكترونية بأفضل الأسعار مع توصيل لجميع محافظات مصر
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-8 md:mb-12 px-4">
              <Button variant="hero" size="lg" className="md:text-lg" asChild>
                <a href="#products">تسوق الآن</a>
              </Button>
              <Button variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground md:text-lg">
                <a href="#about">اعرف أكثر</a>
              </Button>
            </div>

            {/* Features - Static, no animations for faster paint */}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-6 px-2">
              {features.map((feature, index) => (
                <div key={index} className="flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 bg-primary-foreground/5 backdrop-blur-sm rounded-xl">
                  <feature.icon className="w-6 h-6 md:w-8 md:h-8 text-secondary" />
                  <span className="text-xs md:text-sm font-medium">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
});

HeroOptimized.displayName = 'HeroOptimized';

export default HeroOptimized;
