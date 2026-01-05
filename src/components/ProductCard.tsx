import React, { useState, useEffect, useCallback, memo } from 'react';
import { ShoppingCart, Check, ChevronRight, ChevronLeft, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import NotifyWhenAvailable from '@/components/NotifyWhenAvailable';

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
}

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
  stock_count?: number | null;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = memo(({ product }) => {
  const { addToCart, items } = useCart();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [additionalImages, setAdditionalImages] = useState<ProductImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  const isInCart = items.some(item => item.id === product.id);
  const isFav = isFavorite(product.id);
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;
  // Check stock: out of stock if in_stock is false OR stock_count is 0
  const inStock = product.in_stock !== false && (product.stock_count === null || product.stock_count === undefined || product.stock_count > 0);
  
  // Check if description needs "read more"
  const descriptionLimit = 60;
  const hasLongDescription = product.description && product.description.length > descriptionLimit;
  const truncatedDescription = hasLongDescription 
    ? product.description?.slice(0, descriptionLimit) + '...' 
    : product.description;

  const handleToggleDescription = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFullDescription(prev => !prev);
  }, []);

  // Build all images array: main image + additional images
  const allImages = [
    product.image,
    ...additionalImages.map(img => img.image_url)
  ].filter(Boolean) as string[];

  useEffect(() => {
    const fetchAdditionalImages = async () => {
      const { data } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', product.id)
        .order('display_order', { ascending: true });
      
      if (data && data.length > 0) {
        setAdditionalImages(data);
      }
    };

    fetchAdditionalImages();
  }, [product.id]);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
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
  }, [inStock, addToCart, product.id, product.name, product.price, product.image, product.stock_count, toast]);

  const handleToggleFavorite = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
  }, [toggleFavorite, product.id]);

  const nextImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  }, [allImages.length]);

  const prevImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  return (
    <div className="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/30 animate-fade-in">
      {/* Image */}
      <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-muted">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        <img
          src={allImages[currentImageIndex] || '/placeholder.svg'}
          alt={product.name}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-all duration-500 group-hover:scale-110",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
        />
        
        {/* Favorite Button */}
        <button
          onClick={handleToggleFavorite}
          className={cn(
            "absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center transition-all z-10",
            isFav 
              ? "bg-red-500 text-white" 
              : "bg-background/80 text-muted-foreground hover:bg-background hover:text-red-500"
          )}
        >
          <Heart className={cn("w-5 h-5", isFav && "fill-current")} />
        </button>
        
        {/* Image Navigation */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={nextImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 hover:bg-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={prevImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 hover:bg-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            {/* Image Dots */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentImageIndex 
                      ? "bg-primary w-4" 
                      : "bg-background/60 hover:bg-background/80"
                  )}
                />
              ))}
            </div>
          </>
        )}
        
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

        {/* Image Counter */}
        {allImages.length > 1 && (
          <div className="absolute top-12 left-3 bg-background/80 text-foreground text-xs px-2 py-1 rounded-full">
            {currentImageIndex + 1}/{allImages.length}
          </div>
        )}

        {/* Quick Add Button - Always visible on mobile, hover on desktop */}
        <div className="absolute inset-x-3 bottom-3 opacity-100 md:opacity-0 translate-y-0 md:translate-y-4 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-300">
          {inStock ? (
            <Button
              variant={isInCart ? "success" : "default"}
              className="w-full text-sm md:text-base"
              size="sm"
              onClick={handleAddToCart}
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
          ) : (
            <NotifyWhenAvailable 
              productId={product.id} 
              productName={product.name}
              variant="compact"
              className="w-full text-sm md:text-base"
            />
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-3 md:p-4">
        <span className="text-[10px] md:text-xs font-medium text-primary bg-accent px-2 py-0.5 md:py-1 rounded-full">
          {product.category}
        </span>
        
        <h3 className="text-sm md:text-lg font-bold text-foreground mt-2 mb-1 line-clamp-2 md:line-clamp-1">
          {product.name}
        </h3>
        
        {/* Description with Read More */}
        {product.description && (
          <div className="hidden md:block mb-2">
            <p className="text-xs md:text-sm text-muted-foreground">
              {showFullDescription ? product.description : truncatedDescription}
            </p>
            {hasLongDescription && (
              <button
                onClick={handleToggleDescription}
                className="text-xs text-primary hover:underline mt-1 font-medium"
              >
                {showFullDescription ? 'عرض أقل' : 'اقرأ المزيد'}
              </button>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-2 md:mt-3 gap-1">
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            <span className="text-base md:text-xl font-bold text-primary">
              {product.price} ج.م
            </span>
            {product.original_price && (
              <span className="text-xs md:text-sm text-muted-foreground line-through">
                {product.original_price} ج.م
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;