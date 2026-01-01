import React from 'react';
import { Zap, Phone, MapPin, Clock } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer id="contact" className="gradient-hero text-primary-foreground py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {/* Logo & About */}
          <div className="text-center sm:text-right">
            <div className="flex items-center gap-2 mb-3 md:mb-4 justify-center sm:justify-start">
              <div className="w-8 h-8 md:w-10 md:h-10 gradient-secondary rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 md:w-5 md:h-5 text-secondary-foreground" />
              </div>
              <h3 className="text-lg md:text-xl font-bold">حمودي ستور</h3>
            </div>
            <p className="text-primary-foreground/80 text-xs md:text-sm">
              متجرك الإلكتروني الموثوق لأفضل المنتجات الإلكترونية بأسعار منافسة وتوصيل لجميع محافظات مصر
            </p>
          </div>

          {/* Contact Info */}
          <div id="about" className="text-center sm:text-right">
            <h4 className="font-bold mb-3 md:mb-4 text-sm md:text-base">تواصل معنا</h4>
            <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
              <div className="flex items-center gap-2 md:gap-3 justify-center sm:justify-start">
                <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 text-secondary" />
                <span dir="ltr">01025529130</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 justify-center sm:justify-start">
                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-secondary" />
                <span>توصيل لجميع محافظات مصر</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 justify-center sm:justify-start">
                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-secondary" />
                <span>متاح 24/7</span>
              </div>
              <div className="pt-2">
                <a className="block text-primary-foreground/90 hover:text-primary-foreground underline-offset-4 hover:underline" href="/track">
                  تتبع الطلب
                </a>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="text-center sm:text-right sm:col-span-2 md:col-span-1">
            <h4 className="font-bold mb-3 md:mb-4 text-sm md:text-base">طرق الدفع</h4>
            <div className="flex flex-row sm:flex-col gap-3 sm:gap-2 text-xs md:text-sm justify-center sm:justify-start">
              <div className="flex items-center gap-2">
                <span className="text-base md:text-lg">📱</span>
                <span>فودافون كاش</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base md:text-lg">🏦</span>
                <span>انستا باي</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-6 md:mt-8 pt-6 md:pt-8 text-center text-xs md:text-sm text-primary-foreground/60">
          <p>© {new Date().getFullYear()} حمودي ستور. جميع الحقوق محفوظة</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
