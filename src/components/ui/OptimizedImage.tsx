import React, { useState, useRef, useEffect, ImgHTMLAttributes, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  fallback?: string;
  /** Imagem de baixa qualidade (Data URI ou small thumb) para o efeito blur-up */
  lqip?: string;
  blur?: boolean;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '3:2' | 'auto';
  priority?: boolean;
  srcset?: string;
  sizes?: string;
  /** Largura desejada para otimização no Cloudflare */
  width?: number;
  /** Qualidade da compressão (1-100) */
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
  /** Adiciona hint de pré-carregamento para DNS/TCP/TLS */
  preloadHints?: boolean;
}

const aspectRatioClasses = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-video',
  '3:2': 'aspect-[3/2]',
  'auto': '',
};

/**
 * Helper para gerar URL de otimização do Cloudflare via Worker
 */
function getOptimizedUrl(src: string, options: { width?: number; quality?: number }): string {
  // If src is local/imported via Vite (already has hash or starts with /assets), skip Cloudflare Worker 
  // as Vite already handles optimization and the Worker might return 404 for dynamic hashed paths.
  if (!src || src.startsWith('data:') || src.startsWith('blob:') || src.includes('localhost') || src.includes('/assets/')) {
    return src;
  }

  const { width = 800, quality = 85 } = options;
  const workerUrl = 'https://r2-worker.rafalegollas.workers.dev/cdn-cgi/image';
  
  try {
    const encodedSrc = encodeURIComponent(src.startsWith('/') ? `${window.location.origin}${src}` : src);
    return `${workerUrl}/width=${width},quality=${quality},format=auto/${encodedSrc}`;
  } catch {
    return src;
  }
}

function isValidImageSrc(src: string): boolean {
  const s = src?.trim();
  if (!s || s.startsWith('/api/')) return false;
  return s.startsWith('http:') || s.startsWith('https:') || s.startsWith('data:') || s.startsWith('blob:') || s.startsWith('/');
}

export function OptimizedImage({
  src,
  alt,
  fallback = '/placeholder.svg',
  lqip,
  blur = true,
  aspectRatio = 'auto',
  priority = false,
  srcset,
  sizes,
  width,
  quality,
  className,
  onLoad,
  onError,
  preloadHints = false,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const optimizedSrc = useMemo(() => {
    return getOptimizedUrl(src, { width, quality });
  }, [src, width, quality]);

  const srcInvalid = !isValidImageSrc(src);
  const initialSrc = srcInvalid ? fallback : optimizedSrc;
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const effectiveSrc = hasError ? fallback : currentSrc;

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setCurrentSrc(initialSrc);
  }, [initialSrc, src]);

  useEffect(() => {
    if (!srcInvalid) return;
    logger.warn('Imagem ignorada por src inválido; usando fallback', { src, alt }, 'OptimizedImage');
  }, [alt, src, srcInvalid]);

  useEffect(() => {
    if (!preloadHints || !effectiveSrc || srcInvalid) return;
    try {
      const url = new URL(effectiveSrc, window.location.origin);
      const origin = url.origin;
      if (origin === window.location.origin) return;

      const preconnectLink = document.createElement('link');
      preconnectLink.rel = 'preconnect';
      preconnectLink.href = origin;
      preconnectLink.crossOrigin = 'anonymous';
      document.head.appendChild(preconnectLink);

      const dnsLink = document.createElement('link');
      dnsLink.rel = 'dns-prefetch';
      dnsLink.href = origin;
      document.head.appendChild(dnsLink);

      return () => {
        document.head.removeChild(preconnectLink);
        document.head.removeChild(dnsLink);
      };
    } catch {
      return undefined;
    }
  }, [preloadHints, effectiveSrc, srcInvalid]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    if (!srcInvalid && currentSrc === optimizedSrc && optimizedSrc !== src) {
      logger.warn('Falha ao carregar imagem otimizada; tentando URL original', {
        src,
        optimizedSrc,
        alt,
      }, 'OptimizedImage');
      setIsLoaded(false);
      setCurrentSrc(src);
      return;
    }

    if (currentSrc !== fallback) {
      logger.warn('Falha ao carregar imagem original; usando fallback', {
        src,
        currentSrc,
        fallback,
        alt,
      }, 'OptimizedImage');
      setIsLoaded(false);
      setCurrentSrc(fallback);
      return;
    }

    setHasError(true);
    logger.warn('Falha definitiva ao carregar imagem', {
      src,
      fallback,
      alt,
    }, 'OptimizedImage');
    onError?.();
  };

  return (
    <div className={cn('relative overflow-hidden bg-muted', aspectRatioClasses[aspectRatio], className)}>
      {!isLoaded && (
        <>
          {lqip ? (
            <img src={lqip} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110" />
          ) : (
            blur && <div className="absolute inset-0 animate-pulse bg-muted" />
          )}
        </>
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
        className={cn('h-full w-full object-cover transition-opacity duration-300', isLoaded ? 'opacity-100' : 'opacity-0')}
        {...props}
      />
    </div>
  );
}

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
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  if (!src || hasError) {
    return (
      <div className={cn('flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium', sizeClasses[size], className)}>
        {initials}
      </div>
    );
  }

  const optimizedSrc = getOptimizedUrl(src, { width: 128, quality: 80 });

  return (
    <img
      src={optimizedSrc}
      alt={name}
      loading="lazy"
      onError={() => setHasError(true)}
      className={cn('rounded-full object-cover', sizeClasses[size], className)}
    />
  );
}

export default OptimizedImage;
