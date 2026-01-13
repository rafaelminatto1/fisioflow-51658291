import React, { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  fallback?: string;
  blur?: boolean;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '3:2' | 'auto';
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

const aspectRatioClasses = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-video',
  '3:2': 'aspect-[3/2]',
  'auto': '',
};

/**
 * Componente de imagem otimizado com:
 * - Lazy loading nativo
 * - Placeholder blur
 * - Fallback em caso de erro
 * - Aspect ratio mantido
 */
export function OptimizedImage({
  src,
  alt,
  fallback = '/placeholder.svg',
  blur = true,
  aspectRatio = 'auto',
  priority = false,
  className,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset states when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const imageSrc = hasError ? fallback : src;

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectRatioClasses[aspectRatio],
        className
      )}
    >
      {/* Placeholder/Loading state */}
      {!isLoaded && blur && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        {...props}
      />
    </div>
  );
}

/**
 * Hook para preload de imagens
 * Útil para imagens críticas acima do fold
 */
/* eslint-disable-next-line react-refresh/only-export-components */
export function useImagePreload(src: string): boolean {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setIsLoaded(true); // Consider loaded even on error
    img.src = src;
  }, [src]);

  return isLoaded;
}

/**
 * Preload de múltiplas imagens
 */
/* eslint-disable-next-line react-refresh/only-export-components */
export function useImagesPreload(srcs: string[]): boolean {
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    let isMounted = true;
    
    srcs.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        if (isMounted) setLoaded((prev) => prev + 1);
      };
      img.onerror = () => {
        if (isMounted) setLoaded((prev) => prev + 1);
      };
      img.src = src;
    });

    return () => {
      isMounted = false;
    };
  }, [srcs]);

  return loaded === srcs.length;
}

/**
 * Componente Avatar otimizado
 */
interface AvatarImageProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function AvatarImage({ src, name, size = 'md', className }: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);
  
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium',
          sizeClasses[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setHasError(true)}
      className={cn(
        'rounded-full object-cover',
        sizeClasses[size],
        className
      )}
    />
  );
}

export default OptimizedImage;
