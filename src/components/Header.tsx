import React, { useState } from 'react';
import { ShoppingCart, Menu, X, Zap, Search, User, LogOut, Package, Settings, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import CartDrawer from '@/components/CartDrawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onCartClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onCartClick }) => {
  const { totalItems } = useCart();
  const { user, profile, isAuthenticated, signOut } = useAuth();
  const { favoriteCount } = useFavorites();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleCartClick = () => {
    if (onCartClick) {
      onCartClick();
    } else {
      setIsCartOpen(true);
    }
  };

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

          {/* Cart & User Menu */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="max-w-[100px] truncate">{profile?.full_name || 'حسابي'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/favorites" className="flex items-center gap-2 cursor-pointer">
                      <Heart className="w-4 h-4" />
                      المفضلة
                      {favoriteCount > 0 && (
                        <span className="mr-auto text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                          {favoriteCount}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-orders" className="flex items-center gap-2 cursor-pointer">
                      <Package className="w-4 h-4" />
                      طلباتي
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" />
                      إعدادات الحساب
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={signOut}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 ml-2" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  <User className="w-4 h-4 ml-2" />
                  تسجيل الدخول
                </Button>
              </Link>
            )}

            <Button
              variant="outline"
              size="icon"
              className="relative"
              onClick={handleCartClick}
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
            isMenuOpen ? "max-h-[400px] pb-4" : "max-h-0"
          )}
        >
          <div className="flex flex-col gap-1 pt-2">
            <a
              href="#products"
              className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium text-sm"
              onClick={() => setIsMenuOpen(false)}
            >
              المنتجات
            </a>
            <Link
              to="/track"
              className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium flex items-center gap-2 text-sm"
              onClick={() => setIsMenuOpen(false)}
            >
              <Search className="w-4 h-4" />
              تتبع الطلب
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  to="/favorites"
                  className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium flex items-center gap-2 text-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Heart className="w-4 h-4" />
                  المفضلة
                  {favoriteCount > 0 && (
                    <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                      {favoriteCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/my-orders"
                  className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium flex items-center gap-2 text-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Package className="w-4 h-4" />
                  طلباتي
                </Link>
                <Link
                  to="/account"
                  className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium flex items-center gap-2 text-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="w-4 h-4" />
                  إعدادات الحساب
                </Link>
                <button
                  className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium text-destructive flex items-center gap-2 text-right w-full text-sm"
                  onClick={() => { signOut(); setIsMenuOpen(false); }}
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium flex items-center gap-2 text-sm"
                onClick={() => setIsMenuOpen(false)}
              >
                <User className="w-4 h-4" />
                تسجيل الدخول
              </Link>
            )}
            <a
              href="#contact"
              className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium text-sm"
              onClick={() => setIsMenuOpen(false)}
            >
              تواصل معنا
            </a>
          </div>
        </nav>
      </div>

      {/* Cart Drawer for standalone usage */}
      {!onCartClick && (
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      )}
    </header>
  );
};

export default Header;
