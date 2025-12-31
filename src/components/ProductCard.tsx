import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

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
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, items } = useCart();
  const { toast } = useToast();
  const [additionalImages, setAdditionalImages] = useState<ProductImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const isInCart = items.some(item => item.id === product.id);
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;
  const inStock = product.in_stock !== false;

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

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/30 animate-fade-in">
      {/* Image */}
      <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-muted">
        <img
          src={allImages[currentImageIndex] || '/placeholder.svg'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
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
          <div className="absolute top-3 left-3 bg-background/80 text-foreground text-xs px-2 py-1 rounded-full">
            {currentImageIndex + 1}/{allImages.length}
          </div>
        )}

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
      </Link>

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