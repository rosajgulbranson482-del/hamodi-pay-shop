import React, { useState, useRef, memo, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Flame, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  image: string | null;
  badge: string | null;
  stock_count?: number | null;
  in_stock?: boolean | null;
}

// Optimized image URL generator
const getOptimizedImageUrl = (src: string): string => {
  if (!src) return '/placeholder.svg';
  const pattern = /\/storage\/v1\/object\/public\//;
  if (pattern.test(src)) {
    return src.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + 
      '?width=220&height=220&quality=70&resize=contain';
  }
  return src;
};

const OfferCard = memo(({ product, isInCart, onAddToCart }: { 
  product: Product; 
  isInCart: boolean;
  onAddToCart: (e: React.MouseEvent, product: Product) => void;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const optimizedSrc = getOptimizedImageUrl(product.image || '');

  return (
    <Link
      to={`/product/${product.id}`}
      className="flex-shrink-0 w-[160px] md:w-[220px] group"
    >
      <div className="bg-card rounded-xl md:rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-200">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-muted" />
          )}
          <img
            src={optimizedSrc}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            className={cn(
              "w-full h-full object-cover group-hover:scale-105 transition-transform duration-200",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
          />
          
          {/* Discount Badge */}
          {discount > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 gradient-secondary rounded-full">
              <Percent className="w-3 h-3 text-secondary-foreground" />
              <span className="text-xs font-bold text-secondary-foreground">
                {discount}%
              </span>
            </div>
          )}

          {product.badge && (
            <div className="absolute top-2 left-2 px-2 py-1 gradient-primary rounded-full">
              <span className="text-[10px] md:text-xs font-bold text-primary-foreground">
                {product.badge}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-2.5 md:p-3">
          <h3 className="text-xs md:text-sm font-semibold text-foreground line-clamp-2 mb-2 min-h-[2.5rem] md:min-h-[2.75rem]">
            {product.name}
          </h3>
          
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm md:text-base font-bold text-primary">
              {product.price} ج.م
            </span>
            {product.original_price && (
              <span className="text-[10px] md:text-xs text-muted-foreground line-through">
                {product.original_price}
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant={isInCart ? "success" : "default"}
            className="w-full text-xs md:text-sm h-8 md:h-9"
            onClick={(e) => onAddToCart(e, product)}
          >
            {isInCart ? "في السلة ✓" : "أضف للسلة"}
          </Button>
        </div>
      </div>
    </Link>
  );
});

OfferCard.displayName = 'OfferCard';

const SpecialOffers: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addToCart, items } = useCart();
  const { toast } = useToast();

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['special-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, original_price, image, badge, stock_count, in_stock')
        .not('original_price', 'is', null)
        .eq('in_stock', true)
        .gt('stock_count', 0)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  }, []);

  const handleAddToCart = useCallback((e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image || '',
      stockCount: product.stock_count,
    });
    toast({
      title: "تمت الإضافة للسلة",
      description: `تم إضافة ${product.name} إلى سلة التسوق`,
    });
  }, [addToCart, toast]);

  if (isLoading) {
    return (
      <section className="py-6 md:py-10 bg-gradient-to-l from-destructive/5 via-secondary/10 to-primary/5">
        <div className="container mx-auto px-3 md:px-4">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div>
              <Skeleton className="h-6 w-24 mb-1" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="flex gap-3 md:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[160px] md:w-[220px]">
                <Skeleton className="aspect-square rounded-xl" />
                <div className="p-2.5 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (offers.length === 0) return null;

  return (
    <section className="py-6 md:py-10 bg-gradient-to-l from-destructive/5 via-secondary/10 to-primary/5">
      <div className="container mx-auto px-3 md:px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 md:p-2.5 gradient-secondary rounded-xl">
              <Flame className="w-5 h-5 md:w-6 md:h-6 text-secondary-foreground" />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-foreground">
                عروض خاصة
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                وفر أكثر مع خصوماتنا المميزة
              </p>
            </div>
          </div>
          
          {/* Navigation Arrows - Desktop */}
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => scroll('right')}
              className="p-2 rounded-full bg-card border border-border hover:bg-accent transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('left')}
              className="p-2 rounded-full bg-card border border-border hover:bg-accent transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Offers Carousel */}
        <div 
          ref={scrollRef}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-3 px-3 md:mx-0 md:px-0"
        >
          {offers.map((product) => (
            <OfferCard
              key={product.id}
              product={product}
              isInCart={items.some(item => item.id === product.id)}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpecialOffers;
