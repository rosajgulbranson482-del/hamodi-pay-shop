import React, { memo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

const categories = [
  { id: "الكل", label: "الكل", icon: LayoutGrid, slug: null },
  { id: "سماعات", label: "سماعات", icon: Headphones, slug: "headphones" },
  { id: "ساعات", label: "ساعات", icon: Watch, slug: "watches" },
  { id: "شواحن", label: "شواحن", icon: BatteryCharging, slug: "chargers" },
  { id: "باور بانك", label: "باور بانك", icon: Battery, slug: "powerbank" },
  { id: "كابلات", label: "كابلات", icon: Cable, slug: "cables" },
  { id: "إكسسوارات", label: "إكسسوارات", icon: Sparkles, slug: "accessories" },
  { id: "جيمنج", label: "جيمنج", icon: Gamepad2, slug: "gaming" },
];

const CategoryNav: React.FC<CategoryNavProps> = memo(({ selectedCategory, onSelectCategory }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine if we're on a category page
  const currentCategorySlug = location.pathname.startsWith('/category/') 
    ? location.pathname.split('/category/')[1] 
    : null;

  const handleCategoryClick = useCallback((category: typeof categories[0]) => {
    // If on home page with filter callback, use filtering behavior
    if (onSelectCategory && location.pathname === '/') {
      onSelectCategory(category.id);
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
    } else {
      // Navigate to category page or home
      if (category.slug) {
        navigate(`/category/${category.slug}`);
      } else {
        navigate('/');
      }
    }
  }, [onSelectCategory, navigate, location.pathname]);

  const isSelected = (category: typeof categories[0]) => {
    if (currentCategorySlug) {
      return category.slug === currentCategorySlug;
    }
    return selectedCategory === category.id;
  };

  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-2 md:px-4">
        <div className="flex overflow-x-auto scrollbar-hide py-2 md:py-3 gap-1.5 md:gap-2 -mx-2 px-2 md:mx-0 md:px-0 md:justify-center md:flex-wrap">
          {categories.map((category) => {
            const Icon = category.icon;
            const selected = isSelected(category);
            
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className={cn(
                  "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all duration-300 flex-shrink-0",
                  selected
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
