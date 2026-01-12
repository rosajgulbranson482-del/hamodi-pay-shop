import React, { useState, memo, lazy, Suspense } from 'react';
import { ShoppingCart, Menu, X, Zap, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';

// Lazy load heavy components
const SearchDialog = lazy(() => import('@/components/SearchDialog'));
const CartDrawer = lazy(() => import('@/components/CartDrawer'));
const UserMenu = lazy(() => import('@/components/UserMenu'));

interface HeaderOptimizedProps {
  onCartClick?: () => void;
}

const HeaderOptimized: React.FC<HeaderOptimizedProps> = memo(({ onCartClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Deferred cart count loading
  React.useEffect(() => {
    const loadCartCount = async () => {
      const { useCart } = await import('@/context/CartContext');
      // This effect will trigger re-render when cart context is ready
    };
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => loadCartCount());
    } else {
      setTimeout(loadCartCount, 100);
    }
  }, []);

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
          <Link to="/" className="flex items-center gap-2">
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
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="text-foreground hover:text-primary transition-colors font-medium flex items-center gap-1"
            >
              <Search className="w-4 h-4" />
              بحث
            </button>
            <a href="#products" className="text-foreground hover:text-primary transition-colors font-medium">
              المنتجات
            </a>
            <Link to="/track" className="text-foreground hover:text-primary transition-colors font-medium flex items-center gap-1">
              تتبع الطلب
            </Link>
            <a href="#contact" className="text-foreground hover:text-primary transition-colors font-medium">
              تواصل معنا
            </a>
          </nav>

          {/* Theme Toggle, Cart & User Menu */}
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            
            {/* Lazy loaded user menu */}
            <Suspense fallback={
              <Link to="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  <User className="w-4 h-4 ml-2" />
                  تسجيل الدخول
                </Button>
              </Link>
            }>
              <UserMenu onMenuClose={() => setIsMenuOpen(false)} />
            </Suspense>

            <Button
              variant="outline"
              size="icon"
              className="relative"
              onClick={handleCartClick}
            >
              <ShoppingCart className="w-5 h-5" />
              <CartBadge />
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
          <MobileNav 
            onSearchClick={() => { setIsSearchOpen(true); setIsMenuOpen(false); }}
            onClose={() => setIsMenuOpen(false)}
          />
        </nav>
      </div>

      {/* Lazy loaded dialogs */}
      {!onCartClick && isCartOpen && (
        <Suspense fallback={null}>
          <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </Suspense>
      )}

      {isSearchOpen && (
        <Suspense fallback={null}>
          <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </Suspense>
      )}
    </header>
  );
});

// Separate cart badge component with deferred loading
const CartBadge = memo(() => {
  const [count, setCount] = useState(0);

  React.useEffect(() => {
    let mounted = true;
    
    const loadCart = async () => {
      try {
        // Dynamically import cart context
        const cartModule = await import('@/context/CartContext');
        // We'll use a simpler approach - read from localStorage
        const stored = localStorage.getItem('cart-items');
        if (stored && mounted) {
          const items = JSON.parse(stored);
          const total = items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
          setCount(total);
        }
      } catch (e) {
        // Ignore errors
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => loadCart());
    } else {
      setTimeout(loadCart, 50);
    }

    // Listen for cart updates
    const handleStorage = () => loadCart();
    window.addEventListener('cart-updated', handleStorage);
    
    return () => {
      mounted = false;
      window.removeEventListener('cart-updated', handleStorage);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span className="absolute -top-2 -right-2 w-5 h-5 gradient-secondary rounded-full text-xs font-bold flex items-center justify-center text-secondary-foreground">
      {count}
    </span>
  );
});

// Mobile navigation component
const MobileNav = memo(({ onSearchClick, onClose }: { onSearchClick: () => void; onClose: () => void }) => {
  return (
    <div className="flex flex-col gap-1 pt-2">
      <button
        onClick={onSearchClick}
        className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium flex items-center gap-2 text-sm text-right w-full"
      >
        <Search className="w-4 h-4" />
        بحث عن منتج
      </button>
      <a
        href="#products"
        className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium text-sm"
        onClick={onClose}
      >
        المنتجات
      </a>
      <Link
        to="/track"
        className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium flex items-center gap-2 text-sm"
        onClick={onClose}
      >
        تتبع الطلب
      </Link>
      <a
        href="#contact"
        className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium text-sm"
        onClick={onClose}
      >
        تواصل معنا
      </a>
      <Suspense fallback={null}>
        <MobileUserLinks onClose={onClose} />
      </Suspense>
    </div>
  );
});

// Lazy loaded mobile user links
const MobileUserLinks = lazy(() => import('@/components/MobileUserLinks'));

HeaderOptimized.displayName = 'HeaderOptimized';
CartBadge.displayName = 'CartBadge';
MobileNav.displayName = 'MobileNav';

export default HeaderOptimized;