import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import CategoryNav from './CategoryNav';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

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

const ProductGrid: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const filteredProducts = selectedCategory === 'الكل'
    ? products
    : products.filter(product => product.category === selectedCategory);

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
          {loading && (
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
          )}

          {/* Products Grid */}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {filteredProducts.map((product, index) => (
                <div
                  key={product.id}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}

          {!loading && filteredProducts.length === 0 && (
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