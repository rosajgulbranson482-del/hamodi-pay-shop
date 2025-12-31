import React from 'react';
import { Zap, Phone, MapPin, Clock } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer id="contact" className="gradient-hero text-primary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo & About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 gradient-secondary rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-bold">حمودي ستور</h3>
            </div>
            <p className="text-primary-foreground/80 text-sm">
              متجرك الإلكتروني الموثوق لأفضل المنتجات الإلكترونية بأسعار منافسة وتوصيل لجميع محافظات مصر
            </p>
          </div>

          {/* Contact Info */}
          <div id="about">
            <h4 className="font-bold mb-4">تواصل معنا</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-secondary" />
                <span dir="ltr">01025529130</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-secondary" />
                <span>توصيل لجميع محافظات مصر</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-secondary" />
                <span>متاح 24/7</span>
              </div>
              <div className="pt-2 space-y-2">
                <a className="block text-primary-foreground/90 hover:text-primary-foreground underline-offset-4 hover:underline" href="/track">
                  تتبع الطلب
                </a>
                <a className="block text-primary-foreground/90 hover:text-primary-foreground underline-offset-4 hover:underline" href="/auth">
                  دخول المشرف
                </a>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <h4 className="font-bold mb-4">طرق الدفع</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">📱</span>
                <span>فودافون كاش</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🏦</span>
                <span>انستا باي</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-sm text-primary-foreground/60">
          <p>© {new Date().getFullYear()} حمودي ستور. جميع الحقوق محفوظة</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
