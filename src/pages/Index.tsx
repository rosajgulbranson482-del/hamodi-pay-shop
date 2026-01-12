import React, { useState, Suspense, lazy, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import HeaderOptimized from '@/components/HeaderOptimized';
import HeroOptimized from '@/components/HeroOptimized';
import { CartProvider } from '@/context/CartContext';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load components that are below the fold
const SpecialOffers = lazy(() => import('@/components/SpecialOffers'));
const ProductGrid = lazy(() => import('@/components/ProductGrid'));
const Footer = lazy(() => import('@/components/Footer'));
const FloatingWhatsApp = lazy(() => import('@/components/FloatingWhatsApp'));
const CartDrawer = lazy(() => import('@/components/CartDrawer'));
const CheckoutModal = lazy(() => import('@/components/CheckoutModal'));

// Skeleton fallback for lazy sections
const SectionSkeleton = () => (
  <div className="py-6 md:py-10 px-4">
    <div className="container mx-auto">
      <Skeleton className="h-8 w-40 mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

const IndexContent: React.FC = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Deferred data preloading - after initial paint
  useEffect(() => {
    const preload = async () => {
      const { preloadDeferredData } = await import('@/hooks/useDeferredData');
      preloadDeferredData();
    };
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => preload());
    } else {
      setTimeout(preload, 100);
    }
  }, []);

  // Deferred visitor tracking - after everything else
  useEffect(() => {
    const trackVisitor = async () => {
      const { useVisitorTracking } = await import('@/hooks/useVisitorTracking');
    };
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => trackVisitor(), { timeout: 3000 });
    } else {
      setTimeout(trackVisitor, 2000);
    }
  }, []);

  const handleCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>حمودي ستور | أفضل المنتجات الإلكترونية في مصر</title>
        <meta 
          name="description" 
          content="حمودي ستور - متجرك الإلكتروني الموثوق لشراء أفضل المنتجات الإلكترونية بأسعار منافسة. توصيل لجميع محافظات مصر. ادفع بفودافون كاش أو انستا باي." 
        />
        <meta name="keywords" content="حمودي ستور, منتجات إلكترونية, مصر, فودافون كاش, انستا باي, سماعات, ساعات ذكية" />
        <html lang="ar" dir="rtl" />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <HeaderOptimized onCartClick={() => setIsCartOpen(true)} />
        
        <main className="flex-1">
          <HeroOptimized />
          
          <Suspense fallback={<SectionSkeleton />}>
            <SpecialOffers />
          </Suspense>
          
          <Suspense fallback={<SectionSkeleton />}>
            <ProductGrid />
          </Suspense>
        </main>

        <Suspense fallback={null}>
          <Footer />
        </Suspense>
        
        <Suspense fallback={null}>
          <FloatingWhatsApp />
        </Suspense>
        
        {isCartOpen && (
          <Suspense fallback={null}>
            <CartDrawer
              isOpen={isCartOpen}
              onClose={() => setIsCartOpen(false)}
              onCheckout={handleCheckout}
            />
          </Suspense>
        )}

        {isCheckoutOpen && (
          <Suspense fallback={null}>
            <CheckoutModal
              isOpen={isCheckoutOpen}
              onClose={() => setIsCheckoutOpen(false)}
            />
          </Suspense>
        )}
      </div>
    </>
  );
};

const Index: React.FC = () => {
  return (
    <CartProvider>
      <IndexContent />
    </CartProvider>
  );
};

export default Index;
