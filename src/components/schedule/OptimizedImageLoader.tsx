/**
 * OptimizedImageLoader - Componente de carregamento otimizado de imagens
 *
 * Performance: Otimiza carregamento de imagens
 * - Lazy loading nativo
 * - Blur placeholder com base64
 * - WebP/AVIF fallback
 * - Carregamento progressivo
 * - Cache estratégico
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface OptimizedImageLoaderProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholder?: string; // Base64 placeholder ou blur URL
  lazy?: boolean;
  priority?: boolean; // Carrega imediatamente (above the fold)
  onLoad?: () => void;
  onError?: () => void;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  quality?: number; // 1-100
  formats?: ('webp' | 'avif' | 'jpg' | 'png')[];
}

interface ImageLoadState {
  isLoading: boolean;
  isLoaded: boolean;
  isError: boolean;
  progress: number;
}

// Generate blur placeholder (base64)
const generateBlurPlaceholder = (width: number = 100, height: number = 100): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, width, height);
  }

  return canvas.toDataURL('image/jpeg', 0.1);
};

// Detect supported image formats
const getSupportedFormat = (formats: string[]): string => {
  const img = document.createElement('img');

  // Verificar AVIF
  if (formats.includes('avif')) {
    img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlwAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    if (img.complete) return 'avif';
  }

  // Verificar WebP
  if (formats.includes('webp')) {
    img.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    if (img.complete) return 'webp';
  }

  // Fallback para JPEG
  return 'jpg';
};

export const OptimizedImageLoader = memo(({
  src,
  alt,
  className,
  width,
  height,
  placeholder,
  lazy = true,
  priority = false,
  onLoad,
  onError,
  objectFit = 'cover',
  quality = 85,
  formats = ['avif', 'webp', 'jpg'],
}: OptimizedImageLoaderProps) => {
  const [state, setState] = useState<ImageLoadState>({
    isLoading: !priority,
    isLoaded: priority,
    isError: false,
    progress: 0,
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasLoadedRef = useRef(false);

  // Get optimized image URL
  const getOptimizedSrc = useCallback((originalSrc: string): string => {
    try {
      const url = new URL(originalSrc, window.location.origin);

      // Se for uma URL do Firebase Storage ou CDN, adicionar parâmetros de otimização
      if (url.hostname.includes('firebasestorage') || url.hostname.includes('cloudinary')) {
        url.searchParams.set('q', quality.toString());
        url.searchParams.set('w', (width || 800).toString());

        const format = getSupportedFormat(formats);
        if (format !== 'jpg') {
          url.searchParams.set('f', format);
        }
      }

      return url.toString();
    } catch {
      return originalSrc;
    }
  }, [quality, width, formats]);

  const optimizedSrc = getOptimizedSrc(src);
  const blurPlaceholder = placeholder || generateBlurPlaceholder(width || 100, height || 100);

  // Handle image load
  const handleLoad = useCallback(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setState(prev => ({ ...prev, isLoading: false, isLoaded: true, progress: 100 }));
      onLoad?.();
    }
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: false, isLoaded: false, isError: true, progress: 0 }));
    onError?.();
  }, [onError]);

  // Handle progress (para upload de imagens)
  const handleProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress }));
  }, []);

  // Setup Intersection Observer para lazy loading
  useEffect(() => {
    if (!lazy || priority) {
      return;
    }

    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !state.isLoaded && !hasLoadedRef.current) {
            img.src = optimizedSrc;
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px 0px', // Começa a carregar 50px antes
        threshold: 0.01,
      }
    );

    observerRef.current = observer;
    observer.observe(img);

    return () => {
      observer.disconnect();
    };
  }, [lazy, priority, optimizedSrc, state.isLoaded]);

  // Carregar imediatamente se priority=true
  useEffect(() => {
    if (priority && imgRef.current && !state.isLoaded) {
      imgRef.current.src = optimizedSrc;
    }
  }, [priority, optimizedSrc, state.isLoaded]);

  // Style
  const style: React.CSSProperties = {
    objectFit,
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
  };

  return (
    <div
      className={cn('relative overflow-hidden bg-muted/20', className)}
      style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : 'auto' }}
    >
      {/* Blur placeholder */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-500',
          state.isLoaded ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          backgroundImage: `url(${blurPlaceholder})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Loading indicator */}
      {state.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            {state.progress > 0 && state.progress < 100 && (
              <span className="text-xs text-muted-foreground">{Math.round(state.progress)}%</span>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {state.isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
          <div className="text-center text-muted-foreground">
            <svg
              className="w-12 h-12 mx-auto mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm">Erro ao carregar imagem</span>
          </div>
        </div>
      )}

      {/* Image */}
      <img
        ref={imgRef}
        src={priority || !lazy ? optimizedSrc : undefined}
        alt={alt}
        className={cn(
          'w-full h-full transition-opacity duration-500',
          state.isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        style={style}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        decoding="async"
      />
    </div>
  );
});

OptimizedImageLoader.displayName = 'OptimizedImageLoader';

// Componente simplificado para avatares
export const OptimizedAvatar = memo(({ src, alt, size = 40, className }: { src?: string; alt?: string; size?: number; className?: string }) => {
  if (!src) {
    return (
      <div
        className={cn('rounded-full bg-muted flex items-center justify-center text-muted-foreground', className)}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {alt?.charAt(0)?.toUpperCase() || '?'}
      </div>
    );
  }

  return (
    <OptimizedImageLoader
      src={src}
      alt={alt || ''}
      className={cn('rounded-full', className)}
      width={size}
      height={size}
      objectFit="cover"
      quality={80}
    />
  );
});

OptimizedAvatar.displayName = 'OptimizedAvatar';
