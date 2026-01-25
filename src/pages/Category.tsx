import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

// Category mapping for URLs
const categorySlugMap: Record<string, string> = {
  'headphones': 'سماعات',
  'watches': 'ساعات',
  'chargers': 'شواحن',
  'powerbank': 'باور بانك',
  'cables': 'كابلات',
  'accessories': 'إكسسوارات',
  'gaming': 'جيمنج',
};

const categoryMetaMap: Record<string, { title: string; description: string; keywords: string }> = {
  'سماعات': {
    title: 'سماعات بلوتوث ولاسلكية',
    description: 'تسوق أفضل سماعات بلوتوث ولاسلكية بأسعار منافسة. سماعات عالية الجودة مع إلغاء الضوضاء وبطارية طويلة. توصيل سريع لجميع محافظات مصر.',
    keywords: 'سماعات بلوتوث, سماعات لاسلكية, سماعات ايربودز, سماعات هيدفون, سماعات رأس, سماعات مصر'
  },
  'ساعات': {
    title: 'ساعات ذكية وسمارت واتش',
    description: 'اكتشف أحدث الساعات الذكية وسمارت واتش بأفضل الأسعار. متابعة اللياقة البدنية، مقاومة للماء، شاشة عالية الدقة. شحن لجميع أنحاء مصر.',
    keywords: 'ساعات ذكية, سمارت واتش, ساعة ذكية, Apple Watch, ساعات رياضية, ساعات مصر'
  },
  'شواحن': {
    title: 'شواحن سريعة وأصلية',
    description: 'شواحن سريعة أصلية لجميع الأجهزة. شواحن 65 وات، شواحن لاسلكية، شواحن سيارة. حماية من الحرارة الزائدة. توصيل لكل مصر.',
    keywords: 'شواحن سريعة, شاحن أصلي, شاحن لاسلكي, شاحن 65 وات, شواحن آيفون, شواحن سامسونج'
  },
  'باور بانك': {
    title: 'باور بانك وبطاريات محمولة',
    description: 'باور بانك عالي السعة 10000 و 20000 مللي أمبير. شحن سريع للهواتف واللابتوب. بطاريات محمولة أصلية بضمان. شحن لجميع المحافظات.',
    keywords: 'باور بانك, بطارية محمولة, power bank, شاحن متنقل, باور بانك 20000, باور بانك سريع'
  },
  'كابلات': {
    title: 'كابلات شحن أصلية ومضفرة',
    description: 'كابلات شحن عالية الجودة USB-C و Lightning. كابلات مضفرة متينة تدعم الشحن السريع. أطوال مختلفة. توصيل سريع.',
    keywords: 'كابلات شحن, كابل USB-C, كابل Lightning, كابل مضفر, كابلات أصلية, كابلات آيفون'
  },
  'إكسسوارات': {
    title: 'إكسسوارات موبايل وتابلت',
    description: 'تشكيلة واسعة من إكسسوارات الموبايل والتابلت. حوامل هاتف، جرابات، واقيات شاشة، ستاندات. أفضل الأسعار في مصر.',
    keywords: 'إكسسوارات موبايل, حامل هاتف, جرابات, واقي شاشة, إكسسوارات تابلت, إكسسوارات مصر'
  },
  'جيمنج': {
    title: 'إكسسوارات جيمنج وألعاب',
    description: 'معدات جيمنج احترافية. ماوس جيمنج، كيبورد، سماعات قيمنق، إضاءة RGB. منتجات أصلية للاعبين المحترفين. شحن سريع.',
    keywords: 'جيمنج, ماوس جيمنج, كيبورد جيمنج, سماعات قيمنق, إكسسوارات ألعاب, gaming مصر'
  },
};

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

const CategoryContent: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Get Arabic category name from slug
  const categoryName = slug ? categorySlugMap[slug] : null;
  const categoryMeta = categoryName ? categoryMetaMap[categoryName] : null;

  const fetchProducts = useCallback(async (pageNum: number, reset = false) => {
    if (!categoryName) return;

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const from = pageNum * PRODUCTS_PER_PAGE;
    const to = from + PRODUCTS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, price, original_price, image, category, in_stock, badge, stock_count')
      .eq('category', categoryName)
      .order('created_at', { ascending: false })
      .range(from, to);

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
  }, [categoryName]);

  useEffect(() => {
    if (categoryName) {
      setPage(0);
      setProducts([]);
      setHasMore(true);
      fetchProducts(0, true);
    }
  }, [categoryName, fetchProducts]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setPage(prev => {
            const nextPage = prev + 1;
            fetchProducts(nextPage);
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
  }, [loading, hasMore, loadingMore, fetchProducts]);

  const handleCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  // Handle invalid category
  if (!categoryName || !categoryMeta) {
    return (
      <div className="min-h-screen flex flex-col">
        <HeaderOptimized onCartClick={() => setIsCartOpen(true)} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-foreground mb-4">الفئة غير موجودة</h1>
            <p className="text-muted-foreground mb-6">عذراً، لم نتمكن من العثور على هذه الفئة</p>
            <Button onClick={() => navigate('/')} className="gradient-primary">
              <ChevronLeft className="w-4 h-4 ml-2" />
              العودة للرئيسية
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const categoryUrl = `https://hamoudi-store.lovable.app/category/${slug}`;

  // JSON-LD for Category/Collection page
  const categorySchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${categoryMeta.title} - حمودي ستور`,
    "description": categoryMeta.description,
    "url": categoryUrl,
    "isPartOf": {
      "@type": "WebSite",
      "name": "حمودي ستور",
      "url": "https://hamoudi-store.lovable.app"
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "الرئيسية",
          "item": "https://hamoudi-store.lovable.app"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": categoryMeta.title,
          "item": categoryUrl
        }
      ]
    }
  };

  return (
    <>
      <Helmet>
        <title>{categoryMeta.title} | حمودي ستور - أفضل الأسعار في مصر</title>
        <meta name="description" content={categoryMeta.description} />
        <meta name="keywords" content={categoryMeta.keywords} />
        <link rel="canonical" href={categoryUrl} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${categoryMeta.title} | حمودي ستور`} />
        <meta property="og:description" content={categoryMeta.description} />
        <meta property="og:url" content={categoryUrl} />
        <meta property="og:site_name" content="حمودي ستور" />
        <meta property="og:locale" content="ar_EG" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${categoryMeta.title} | حمودي ستور`} />
        <meta name="twitter:description" content={categoryMeta.description} />
        
        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(categorySchema)}
        </script>
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <HeaderOptimized onCartClick={() => setIsCartOpen(true)} />
        
        <main className="flex-1">
          {/* Breadcrumb */}
          <nav className="container mx-auto px-4 py-4" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground">
              <li>
                <a href="/" className="hover:text-primary transition-colors">الرئيسية</a>
              </li>
              <li>/</li>
              <li className="text-foreground font-medium">{categoryName}</li>
            </ol>
          </nav>

          <section className="py-8 md:py-16 bg-background">
            <div className="container mx-auto px-3 md:px-4">
              <div className="text-center mb-6 md:mb-12">
                <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2 md:mb-4">
                  {categoryMeta.title} <span className="text-gradient">المميزة</span>
                </h1>
                <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-2">
                  {categoryMeta.description}
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
                  <Button onClick={() => navigate('/')} className="mt-4 gradient-primary">
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
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            onCheckout={handleCheckout}
          />
        )}

        {isCheckoutOpen && (
          <CheckoutModal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
          />
        )}
      </div>
    </>
  );
};

const Category: React.FC = () => {
  return (
    <CartProvider>
      <CategoryContent />
    </CartProvider>
  );
};

export default Category;
