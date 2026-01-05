import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import SpecialOffers from '@/components/SpecialOffers';
import ProductGrid from '@/components/ProductGrid';
import CartDrawer from '@/components/CartDrawer';
import CheckoutModal from '@/components/CheckoutModal';
import Footer from '@/components/Footer';

import { CartProvider } from '@/context/CartContext';

const IndexContent: React.FC = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

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
        <Header onCartClick={() => setIsCartOpen(true)} />
        
        <main className="flex-1">
          <Hero />
          <SpecialOffers />
          <ProductGrid />
        </main>

        <Footer />
        <FloatingWhatsApp />
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onCheckout={handleCheckout}
        />

        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
        />
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
