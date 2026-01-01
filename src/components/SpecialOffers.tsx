import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Flame, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  image: string | null;
  badge: string | null;
}

const SpecialOffers: React.FC = () => {
  const [offers, setOffers] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addToCart, items } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, original_price, image, badge')
      .not('original_price', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setOffers(data);
    }
    setLoading(false);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
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

  if (loading || offers.length === 0) return null;

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
          {offers.map((product) => {
            const discount = product.original_price
              ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
              : 0;
            const isInCart = items.some(item => item.id === product.id);

            return (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="flex-shrink-0 w-[160px] md:w-[220px] group"
              >
                <div className="bg-card rounded-xl md:rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img
                      src={product.image || '/placeholder.svg'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                      onClick={(e) => handleAddToCart(e, product)}
                    >
                      {isInCart ? "في السلة ✓" : "أضف للسلة"}
                    </Button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SpecialOffers;
