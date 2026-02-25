import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import HeaderOptimized from '@/components/HeaderOptimized';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import CartDrawer from '@/components/CartDrawer';
import CheckoutModal from '@/components/CheckoutModal';
import { CartProvider } from '@/context/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Search as SearchIcon, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

const SearchContent: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(query);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(async (searchQuery: string, pageNum: number, reset = false) => {
    if (!searchQuery.trim()) {
      setProducts([]);
      setTotalCount(0);
      return;
    }

    if (reset) setLoading(true);
    else setLoadingMore(true);

    const from = pageNum * PRODUCTS_PER_PAGE;
    const to = from + PRODUCTS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from('products')
      .select('id, name, description, price, original_price, image, category, in_stock, badge, stock_count', { count: 'exact' })
      .ilike('name', `%${searchQuery}%`)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      if (reset) {
        setProducts(data);
        setTotalCount(count || 0);
      } else {
        setProducts(prev => [...prev, ...data]);
      }
      setHasMore(data.length === PRODUCTS_PER_PAGE);
    }

    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    setInputValue(query);
    if (query.trim()) {
      setPage(0);
      setProducts([]);
      setHasMore(true);
      fetchProducts(query, 0, true);
    } else {
      setProducts([]);
      setTotalCount(0);
      setLoading(false);
    }
  }, [query, fetchProducts]);

  // Infinite scroll
  useEffect(() => {
    if (loading || !query.trim()) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setPage(prev => {
            const nextPage = prev + 1;
            fetchProducts(query, nextPage);
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
      observerRef.current?.disconnect();
    };
  }, [loading, hasMore, loadingMore, fetchProducts, query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim() });
    }
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const pageTitle = query
    ? `نتائج البحث عن "${query}" | حمودي ستور`
    : 'البحث في المنتجات | حمودي ستور';

  const pageDescription = query
    ? `عثرنا على ${totalCount} منتج يطابق "${query}". تسوق أفضل المنتجات بأسعار منافسة مع توصيل سريع لجميع محافظات مصر.`
    : 'ابحث في تشكيلة واسعة من المنتجات الإلكترونية والإكسسوارات بأفضل الأسعار في مصر.';

  const canonicalUrl = query
    ? `https://hamodi-pay-shop.lovable.app/search?q=${encodeURIComponent(query)}`
    : 'https://hamodi-pay-shop.lovable.app/search';

  const searchSchema = {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    "name": pageTitle,
    "description": pageDescription,
    "url": canonicalUrl,
    "isPartOf": {
      "@type": "WebSite",
      "name": "حمودي ستور",
      "url": "https://hamodi-pay-shop.lovable.app",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://hamodi-pay-shop.lovable.app/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://hamodi-pay-shop.lovable.app" },
        { "@type": "ListItem", "position": 2, "name": query ? `بحث: ${query}` : "البحث", "item": canonicalUrl }
      ]
    }
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content={query ? "noindex, follow" : "index, follow"} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="حمودي ستور" />
        <meta property="og:locale" content="ar_EG" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <script type="application/ld+json">{JSON.stringify(searchSchema)}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <HeaderOptimized onCartClick={() => setIsCartOpen(true)} />

        <main className="flex-1">
          {/* Breadcrumb */}
          <nav className="container mx-auto px-4 py-4" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground">
              <li><a href="/" className="hover:text-primary transition-colors">الرئيسية</a></li>
              <li>/</li>
              <li className="text-foreground font-medium">{query ? `بحث: ${query}` : 'البحث'}</li>
            </ol>
          </nav>

          <section className="py-6 md:py-12 bg-background">
            <div className="container mx-auto px-3 md:px-4">
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
                <div className="relative">
                  <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="ابحث عن منتج..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="pr-12 pl-24 h-12 text-base rounded-full border-2 border-border focus:border-primary"
                    autoFocus={!query}
                  />
                  <Button type="submit" size="sm" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full px-5">
                    بحث
                  </Button>
                </div>
              </form>

              {/* Results Header */}
              {query && !loading && (
                <div className="text-center mb-6 md:mb-10">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    نتائج البحث عن <span className="text-primary">"{query}"</span>
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground">
                    {totalCount > 0 ? `تم العثور على ${totalCount} منتج` : 'لا توجد نتائج'}
                  </p>
                </div>
              )}

              {!query && (
                <div className="text-center mb-6">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    <SearchIcon className="inline-block w-7 h-7 ml-2" />
                    البحث في المنتجات
                  </h1>
                  <p className="text-muted-foreground">اكتب اسم المنتج الذي تبحث عنه</p>
                </div>
              )}

              {loading && <ProductGridSkeleton />}

              {!loading && products.length > 0 && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  <div ref={loadMoreRef} className="py-8 flex justify-center">
                    {loadingMore && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري تحميل المزيد...</span>
                      </div>
                    )}
                    {!hasMore && products.length > 0 && (
                      <p className="text-muted-foreground text-sm">تم عرض جميع النتائج</p>
                    )}
                  </div>
                </>
              )}

              {!loading && query && products.length === 0 && (
                <div className="text-center py-12">
                  <SearchIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-lg text-muted-foreground mb-2">لا توجد منتجات تطابق بحثك</p>
                  <p className="text-sm text-muted-foreground mb-6">جرب كلمات بحث مختلفة</p>
                  <Button onClick={() => navigate('/')} variant="outline">
                    <ChevronLeft className="w-4 h-4 ml-2" />
                    تصفح جميع المنتجات
                  </Button>
                </div>
              )}
            </div>
          </section>
        </main>

        <Footer />
        <FloatingWhatsApp />

        {isCartOpen && (
          <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onCheckout={handleCheckout} />
        )}
        {isCheckoutOpen && (
          <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
        )}
      </div>
    </>
  );
};

const Search: React.FC = () => (
  <CartProvider>
    <SearchContent />
  </CartProvider>
);

export default Search;
