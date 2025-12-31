import React, { useState } from 'react';
import { ShoppingCart, Menu, X, Zap, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onCartClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onCartClick }) => {
  const { totalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 md:w-12 md:h-12 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                حمودي <span className="text-gradient">ستور</span>
              </h1>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                أفضل المنتجات الإلكترونية
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#products" className="text-foreground hover:text-primary transition-colors font-medium">
              المنتجات
            </a>
            <Link to="/track" className="text-foreground hover:text-primary transition-colors font-medium flex items-center gap-1">
              <Search className="w-4 h-4" />
              تتبع الطلب
            </Link>
            <a href="#contact" className="text-foreground hover:text-primary transition-colors font-medium">
              تواصل معنا
            </a>
          </nav>

          {/* Cart & Mobile Menu */}
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                دخول المشرف
              </Button>
            </Link>

            <Button
              variant="outline"
              size="icon"
              className="relative"
              onClick={onCartClick}
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 gradient-secondary rounded-full text-xs font-bold flex items-center justify-center text-secondary-foreground animate-bounce-subtle">
                  {totalItems}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300",
            isMenuOpen ? "max-h-48 pb-4" : "max-h-0"
          )}
        >
          <div className="flex flex-col gap-2 pt-2">
            <a
              href="#products"
              className="px-4 py-2 rounded-lg hover:bg-accent transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              المنتجات
            </a>
            <Link
              to="/track"
              className="px-4 py-2 rounded-lg hover:bg-accent transition-colors font-medium flex items-center gap-2"
              onClick={() => setIsMenuOpen(false)}
            >
              <Search className="w-4 h-4" />
              تتبع الطلب
            </Link>
            <Link
              to="/auth"
              className="px-4 py-2 rounded-lg hover:bg-accent transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              دخول المشرف
            </Link>
            <a
              href="#contact"
              className="px-4 py-2 rounded-lg hover:bg-accent transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              تواصل معنا
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
