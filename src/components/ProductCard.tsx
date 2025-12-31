import React from 'react';
import { Star, ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image: string | null;
  category: string;
  in_stock: boolean | null;
  badge: string | null;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, items } = useCart();
  const { toast } = useToast();
  const isInCart = items.some(item => item.id === product.id);
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;
  const inStock = product.in_stock !== false;

  const handleAddToCart = () => {
    if (!inStock) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image || '',
    });
    toast({
      title: "تمت الإضافة للسلة",
      description: `تم إضافة ${product.name} إلى سلة التسوق`,
    });
  };

  return (
    <div className="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/30 animate-fade-in">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.image || '/placeholder.svg'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {discount > 0 && (
            <span className="px-3 py-1 gradient-secondary text-secondary-foreground text-sm font-bold rounded-full">
              خصم {discount}%
            </span>
          )}
          {product.badge && (
            <span className="px-3 py-1 gradient-primary text-primary-foreground text-sm font-bold rounded-full">
              {product.badge}
            </span>
          )}
          {!inStock && (
            <span className="px-3 py-1 bg-destructive text-destructive-foreground text-sm font-bold rounded-full">
              نفذ المخزون
            </span>
          )}
        </div>

        {/* Quick Add Button */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <Button
            variant={isInCart ? "success" : "default"}
            className="w-full"
            onClick={handleAddToCart}
            disabled={!inStock}
          >
            {isInCart ? (
              <>
                <Check className="w-4 h-4" />
                في السلة
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                أضف للسلة
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <span className="text-xs font-medium text-primary bg-accent px-2 py-1 rounded-full">
          {product.category}
        </span>
        
        <h3 className="text-lg font-bold text-foreground mt-2 mb-1 line-clamp-1">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">
              {product.price} ج.م
            </span>
            {product.original_price && (
              <span className="text-sm text-muted-foreground line-through">
                {product.original_price} ج.م
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;