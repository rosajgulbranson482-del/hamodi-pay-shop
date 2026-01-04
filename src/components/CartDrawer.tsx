import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout?: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onCheckout }) => {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, totalPrice, totalItems, loading } = useCart();

  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout();
    } else {
      onClose();
      navigate('/checkout');
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-foreground/50 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 z-[60]" : "opacity-0 pointer-events-none -z-10"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-full sm:max-w-md bg-card shadow-xl transition-transform duration-300 flex flex-col",
          isOpen ? "translate-x-0 z-[70]" : "-translate-x-full z-[70]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">سلة التسوق</h2>
            {totalItems > 0 && (
              <span className="px-2 py-0.5 gradient-primary text-primary-foreground text-sm font-bold rounded-full">
                {totalItems}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">جاري تحميل السلة...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">سلة التسوق فارغة</p>
              <p className="text-sm text-muted-foreground">ابدأ بإضافة منتجات للسلة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 bg-muted/50 rounded-xl"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm line-clamp-1">
                      {item.name}
                    </h4>
                    <p className="text-primary font-bold mt-1">
                      {item.price} ج.م
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 bg-card rounded-lg border border-border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground">المجموع الفرعي:</span>
              <span className="text-xl font-bold text-foreground">{totalPrice} ج.م</span>
            </div>
            <Button
              variant="default"
              size="lg"
              className="w-full"
              onClick={handleCheckout}
            >
              متابعة الشراء
            </Button>
          </div>
        )}
      </div>

    </>
  );
};

export default CartDrawer;
