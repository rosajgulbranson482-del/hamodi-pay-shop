import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ShoppingCart, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Star, 
  ArrowRight,
  Minus,
  Plus,
  Share2,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CartProvider, useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import ProductReviews from '@/components/ProductReviews';
import CartDrawer from '@/components/CartDrawer';

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
  stock_count: number | null;
}

const ProductDetailsContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, items } = useCart();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [product, setProduct] = useState<Product | null>(null);
  const [additionalImages, setAdditionalImages] = useState<ProductImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const isInCart = product ? items.some(item => item.id === product.id) : false;
  const isFav = product ? isFavorite(product.id) : false;
  const discount = product?.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;
  // Check stock: out of stock if in_stock is false OR stock_count is 0
  const inStock = product?.in_stock !== false && (product?.stock_count === null || product?.stock_count === undefined || (product?.stock_count ?? 0) > 0);

  const allImages = product ? [
    product.image,
    ...additionalImages.map(img => img.image_url)
  ].filter(Boolean) as string[] : [];

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      setLoading(true);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        navigate('/');
        return;
      }
      
      setProduct(data);
      
      // Fetch additional images
      const { data: images } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('display_order', { ascending: true });
      
      if (images) {
        setAdditionalImages(images);
      }
      
      // Fetch related products
      const { data: related } = await supabase
        .from('products')
        .select('*')
        .eq('category', data.category)
        .neq('id', id)
        .limit(4);
      
      if (related) {
        setRelatedProducts(related);
      }
      
      setLoading(false);
    };

    fetchProduct();
  }, [id, navigate]);

  const handleAddToCart = () => {
    if (!product || !inStock) return;
    
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || '',
      });
    }
    
    toast({
      title: "تمت الإضافة للسلة",
      description: `تم إضافة ${quantity} × ${product.name} إلى سلة التسوق`,
    });
  };

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description || '',
          url: window.location.href,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "تم نسخ الرابط",
        description: "تم نسخ رابط المنتج إلى الحافظة",
      });
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  // Generate star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-5 h-5",
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted"
            )}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted animate-pulse rounded-2xl" />
            <div className="space-y-4">
              <div className="h-8 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
              <div className="h-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const handleOpenCart = () => {
    setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{product.name} | متجرنا</title>
        <meta name="description" content={product.description || `اشتر ${product.name} بأفضل سعر`} />
      </Helmet>
      
      <Header onCartClick={handleOpenCart} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary transition-colors">الرئيسية</Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-foreground">{product.category}</span>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden bg-muted rounded-2xl border border-border">
              <img
                src={allImages[currentImageIndex] || '/placeholder.svg'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              
              {/* Image Navigation */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-full flex items-center justify-center shadow-lg transition-all"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-full flex items-center justify-center shadow-lg transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
              
              {/* Badges */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
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
              </div>
              
              {/* Image Counter */}
              {allImages.length > 1 && (
                <div className="absolute bottom-4 left-4 bg-background/90 text-foreground text-sm px-3 py-1 rounded-full">
                  {currentImageIndex + 1} / {allImages.length}
                </div>
              )}
            </div>
            
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={cn(
                      "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                      idx === currentImageIndex 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <img
                      src={img}
                      alt={`${product.name} - صورة ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category */}
            <span className="inline-block text-sm font-medium text-primary bg-accent px-3 py-1 rounded-full">
              {product.category}
            </span>
            
            {/* Name */}
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
              {product.name}
            </h1>
            
            {/* Rating */}
            <div className="flex items-center gap-3">
              {renderStars(4.5)}
              <span className="text-muted-foreground">(128 تقييم)</span>
            </div>
            
            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-primary">
                {product.price} ج.م
              </span>
              {product.original_price && (
                <span className="text-xl text-muted-foreground line-through">
                  {product.original_price} ج.م
                </span>
              )}
              {discount > 0 && (
                <span className="text-sm font-bold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">
                  وفر {product.original_price! - product.price} ج.م
                </span>
              )}
            </div>

            <Separator />
            
            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">الوصف</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}
            
            {/* Stock Status */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-3 h-3 rounded-full",
                inStock ? "bg-green-500" : "bg-red-500"
              )} />
              <span className={cn(
                "font-medium",
                inStock ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {inStock 
                  ? product.stock_count 
                    ? `متوفر (${product.stock_count} قطعة)` 
                    : "متوفر"
                  : "نفذ المخزون"
                }
              </span>
            </div>

            <Separator />
            
            {/* Quantity & Add to Cart */}
            <div className="space-y-4">
              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="text-foreground font-medium">الكمية:</span>
                <div className="flex items-center border border-border rounded-lg">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="p-2 hover:bg-muted transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="p-2 hover:bg-muted transition-colors"
                    disabled={!inStock || (product.stock_count !== null && quantity >= product.stock_count)}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  variant={isInCart ? "success" : "default"}
                  className="flex-1 text-lg py-6"
                  onClick={handleAddToCart}
                  disabled={!inStock}
                >
                  {isInCart ? (
                    <>
                      <Check className="w-5 h-5" />
                      في السلة
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      أضف للسلة
                    </>
                  )}
                </Button>
                
                <Button
                  size="lg"
                  variant="outline"
                  className="py-6"
                  onClick={handleShare}
                >
                  <Share2 className="w-5 h-5" />
                </Button>
                
                <Button
                  size="lg"
                  variant="outline"
                  className={cn("py-6", isFav && "bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800")}
                  onClick={() => product && toggleFavorite(product.id)}
                >
                  <Heart className={cn("w-5 h-5", isFav && "fill-red-500 text-red-500")} />
                </Button>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium">توصيل سريع</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 rounded-full gradient-secondary flex items-center justify-center">
                  <Check className="w-5 h-5 text-secondary-foreground" />
                </div>
                <span className="text-sm font-medium">ضمان الجودة</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <ProductReviews productId={product.id} />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-foreground mb-6">منتجات مشابهة</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((p) => (
                <Link key={p.id} to={`/product/${p.id}`}>
                  <ProductCard product={p} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      
      <Footer />
      
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

const ProductDetails = () => {
  return (
    <CartProvider>
      <ProductDetailsContent />
    </CartProvider>
  );
};

export default ProductDetails;
