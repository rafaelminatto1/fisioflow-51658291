import React, { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  fallback?: string;
  blur?: boolean;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '3:2' | 'auto';
  priority?: boolean;
  srcset?: string;
  sizes?: string;
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
 * - Suporte a srcset/sizes para responsive images
 */
/** URLs válidas para imagem: http, https, data, blob ou caminho absoluto/relativo começando com / */
function isValidImageSrc(src: string): boolean {
  const s = src?.trim();
  if (!s) return false;
  return (
    s.startsWith('http:') ||
    s.startsWith('https:') ||
    s.startsWith('data:') ||
    s.startsWith('blob:') ||
    s.startsWith('/')
  );
}

export function OptimizedImage({
  src,
  alt,
  fallback = '/placeholder.svg',
  blur = true,
  aspectRatio = 'auto',
  priority = false,
  srcset,
  sizes,
  className,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const srcInvalid = !isValidImageSrc(src);
  const effectiveSrc = srcInvalid || hasError ? fallback : src;
  const skipLoad = srcInvalid;

  // Reset states when src changes
  useEffect(() => {
    if (srcInvalid) {
      setIsLoaded(false);
      setHasError(false);
      return;
    }
    setIsLoaded(false);
    setHasError(false);
  }, [src, srcInvalid]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // URL inválida: mostrar fallback sem tentar carregar o src (evita 404 e request desnecessário)
  if (skipLoad) {
    if (isValidImageSrc(fallback)) {
      return (
        <div
          className={cn(
            'relative overflow-hidden bg-muted',
            aspectRatioClasses[aspectRatio],
            className
          )}
        >
          <img
            ref={imgRef}
            src={fallback}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            className="h-full w-full object-cover"
            {...props}
          />
        </div>
      );
    }
    // src e fallback inválidos: placeholder visual sem request
    return (
      <div
        className={cn(
          'relative overflow-hidden bg-muted flex items-center justify-center',
          aspectRatioClasses[aspectRatio],
          className
        )}
        role="img"
        aria-label={alt}
      />
    );
  }

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
        src={effectiveSrc}
        srcSet={srcset}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        {...(priority && { fetchPriority: 'high' })}
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
