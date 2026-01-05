import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import ProductCard from './ProductCard';
import CategoryNav from './CategoryNav';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

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

const PRODUCTS_PER_PAGE = 12;

const ProductGridSkeleton = memo(() => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="bg-card rounded-xl md:rounded-2xl overflow-hidden">
        <Skeleton className="aspect-square w-full" />
        <div className="p-3 md:p-4 space-y-2">
          <Skeleton className="h-3 md:h-4 w-16 md:w-20" />
          <Skeleton className="h-4 md:h-6 w-full" />
          <Skeleton className="h-3 md:h-4 w-3/4" />
          <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
        </div>
      </div>
    ))}
  </div>
));

ProductGridSkeleton.displayName = 'ProductGridSkeleton';

const ProductGrid: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchProducts = useCallback(async (pageNum: number, category: string, reset = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const from = pageNum * PRODUCTS_PER_PAGE;
    const to = from + PRODUCTS_PER_PAGE - 1;

    let query = supabase
      .from('products')
      .select('id, name, description, price, original_price, image, category, in_stock, badge, stock_count')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (category !== 'الكل') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (!error && data) {
      if (reset) {
        setProducts(data);
      } else {
        setProducts(prev => [...prev, ...data]);
      }
      setHasMore(data.length === PRODUCTS_PER_PAGE);
    }

    setLoading(false);
    setLoadingMore(false);
  }, []);

  // Initial load and category change
  useEffect(() => {
    setPage(0);
    setProducts([]);
    setHasMore(true);
    fetchProducts(0, selectedCategory, true);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedCategory, fetchProducts]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setPage(prev => {
            const nextPage = prev + 1;
            fetchProducts(nextPage, selectedCategory);
            return nextPage;
          });
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, loadingMore, selectedCategory, fetchProducts]);

  return (
    <>
      {/* Sticky Category Navigation */}
      <CategoryNav 
        selectedCategory={selectedCategory} 
        onSelectCategory={setSelectedCategory} 
      />

      <section id="products" className="py-8 md:py-16 bg-background">
        <div className="container mx-auto px-3 md:px-4">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-2 md:mb-4">
              منتجاتنا <span className="text-gradient">المميزة</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-2">
              اختر من بين مجموعة واسعة من المنتجات الإلكترونية عالية الجودة بأفضل الأسعار
            </p>
          </div>

          {/* Loading State */}
          {loading && <ProductGridSkeleton />}

          {/* Products Grid */}
          {!loading && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Load More Trigger */}
              <div ref={loadMoreRef} className="py-8 flex justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري تحميل المزيد...</span>
                  </div>
                )}
                {!hasMore && products.length > 0 && (
                  <p className="text-muted-foreground text-sm">
                    تم عرض جميع المنتجات
                  </p>
                )}
              </div>
            </>
          )}

          {!loading && products.length === 0 && (
            <div className="text-center py-8 md:py-12">
              <p className="text-muted-foreground text-base md:text-lg">
                لا توجد منتجات في هذه الفئة حالياً
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default ProductGrid;