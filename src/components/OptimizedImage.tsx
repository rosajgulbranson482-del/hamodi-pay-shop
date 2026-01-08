import React, { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  onLoad?: () => void;
  size?: 'thumbnail' | 'medium' | 'large' | 'original';
}

// Supabase Storage URL with transformations
const getOptimizedImageUrl = (src: string, size: 'thumbnail' | 'medium' | 'large' | 'original'): string => {
  if (!src || size === 'original') return src;
  
  // Check if it's a Supabase Storage URL
  const supabaseStoragePattern = /\/storage\/v1\/object\/public\//;
  
  if (supabaseStoragePattern.test(src)) {
    // Use Supabase image transformation
    const sizeConfig = {
      thumbnail: { width: 150, height: 150, quality: 60 },
      medium: { width: 400, height: 400, quality: 75 },
      large: { width: 800, height: 800, quality: 85 },
    };
    
    const config = sizeConfig[size];
    
    // Replace /object/public/ with /render/image/public/ and add transformation params
    const transformedUrl = src.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    
    return `${transformedUrl}?width=${config.width}&height=${config.height}&quality=${config.quality}&resize=contain`;
  }
  
  // For external URLs, return as-is
  return src;
};

const OptimizedImage: React.FC<OptimizedImageProps> = memo(({ 
  src, 
  alt, 
  className,
  containerClassName,
  onLoad,
  size = 'medium'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Update optimized URL when src or size changes
  useEffect(() => {
    if (src) {
      setCurrentSrc(getOptimizedImageUrl(src, size));
    }
  }, [src, size]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    // Fallback to original if transformation fails
    if (currentSrc !== src) {
      setCurrentSrc(src);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };

  return (
    <div ref={imgRef} className={cn("relative", containerClassName)}>
      {/* Skeleton placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-inherit" />
      )}
      
      {/* Actual image - only render when in view */}
      {isInView && currentSrc && (
        <img
          src={hasError ? '/placeholder.svg' : currentSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
