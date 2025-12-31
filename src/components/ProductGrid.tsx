import React, { useState } from 'react';
import ProductCard from './ProductCard';
import { products, categories } from '@/data/products';
import { cn } from '@/lib/utils';

const ProductGrid: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  const filteredProducts = selectedCategory === 'الكل'
    ? products
    : products.filter(product => product.category === selectedCategory);

  return (
    <section id="products" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            منتجاتنا <span className="text-gradient">المميزة</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            اختر من بين مجموعة واسعة من المنتجات الإلكترونية عالية الجودة بأفضل الأسعار
          </p>
        </div>

        {/* Categories Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                selectedCategory === category
                  ? "gradient-primary text-primary-foreground shadow-glow"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product, index) => (
            <div
              key={product.id}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              لا توجد منتجات في هذه الفئة حالياً
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductGrid;
