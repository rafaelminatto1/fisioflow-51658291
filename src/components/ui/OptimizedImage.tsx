import React, { useState, useRef, useEffect, ImgHTMLAttributes, useMemo } from 'react';
import { cn } from '@/lib/utils';

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

const HOST_FAILURE_STORAGE_KEY = 'optimized-image-host-failures';
const hostFailureCache = new Set<string>();

(function initHostFailureCache() {
  if (typeof window === 'undefined') return;
  try {
    const saved = localStorage.getItem(HOST_FAILURE_STORAGE_KEY);
    if (!saved) return;
    const parsed: string[] = JSON.parse(saved);
    parsed.filter(Boolean).forEach(host => hostFailureCache.add(host));
  } catch {}
})();

function persistHostFailure(host: string) {
  hostFailureCache.add(host);
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(Array.from(hostFailureCache));
    localStorage.setItem(HOST_FAILURE_STORAGE_KEY, serialized);
  } catch {}
}

function extractHost(src: string): string | null {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const url = new URL(src, base);
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Helper para gerar URL de otimização do Cloudflare via Worker
 */
function getOptimizedUrl(src: string, options: { width?: number; quality?: number }): string {
  if (!src || src.startsWith('data:') || src.startsWith('blob:') || src.includes('localhost')) {
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
  const srcHost = extractHost(src);

  const optimizedSrc = useMemo(() => {
    if (hasError) return fallback;
    return getOptimizedUrl(src, { width, quality });
  }, [src, hasError, fallback, width, quality]);

  const srcInvalid = !isValidImageSrc(src) || (srcHost ? hostFailureCache.has(srcHost) : false);
  const effectiveSrc = srcInvalid || hasError ? fallback : optimizedSrc;
  const skipLoad = srcInvalid;

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src, srcInvalid]);

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
    } catch {}
  }, [preloadHints, effectiveSrc, srcInvalid]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    if (srcHost) persistHostFailure(srcHost);
    onError?.();
  };

  if (skipLoad) {
    return (
      <div className={cn('relative overflow-hidden bg-muted', aspectRatioClasses[aspectRatio], className)}>
        <img ref={imgRef} src={fallback} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" {...props} />
      </div>
    );
  }

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
