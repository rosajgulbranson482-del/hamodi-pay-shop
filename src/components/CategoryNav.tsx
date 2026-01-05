import React, { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Headphones, 
  Watch, 
  BatteryCharging, 
  Battery, 
  Cable, 
  Sparkles,
  Gamepad2,
  LayoutGrid
} from 'lucide-react';

interface CategoryNavProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const categories = [
  { id: "الكل", label: "الكل", icon: LayoutGrid },
  { id: "سماعات", label: "سماعات", icon: Headphones },
  { id: "ساعات", label: "ساعات", icon: Watch },
  { id: "شواحن", label: "شواحن", icon: BatteryCharging },
  { id: "باور بانك", label: "باور بانك", icon: Battery },
  { id: "كابلات", label: "كابلات", icon: Cable },
  { id: "إكسسوارات", label: "إكسسوارات", icon: Sparkles },
  { id: "جيمنج", label: "جيمنج", icon: Gamepad2 },
];

const CategoryNav: React.FC<CategoryNavProps> = memo(({ selectedCategory, onSelectCategory }) => {
  const scrollToProducts = useCallback((category: string) => {
    onSelectCategory(category);
    const productsSection = document.getElementById('products');
    if (productsSection) {
      const headerOffset = 140;
      const elementPosition = productsSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, [onSelectCategory]);

  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-2 md:px-4">
        <div className="flex overflow-x-auto scrollbar-hide py-2 md:py-3 gap-1.5 md:gap-2 -mx-2 px-2 md:mx-0 md:px-0 md:justify-center md:flex-wrap">
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => scrollToProducts(category.id)}
                className={cn(
                  "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all duration-300 flex-shrink-0",
                  isSelected
                    ? "gradient-primary text-primary-foreground shadow-glow"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

CategoryNav.displayName = 'CategoryNav';

export default CategoryNav;
