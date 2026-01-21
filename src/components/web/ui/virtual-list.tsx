import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  keyExtractor: (item: T, index: number) => string;
}

/**
 * Componente de lista virtualizada para renderização eficiente de grandes listas
 * Renderiza apenas os itens visíveis + buffer de overscan
 *
 * @example
 * <VirtualList
 *   items={patients}
 *   itemHeight={80}
 *   height={600}
 *   keyExtractor={(item) => item.id}
 *   renderItem={(patient, index) => <PatientCard key={patient.id} patient={patient} />}
 * />
 */
export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 3,
  className = '',
  keyExtractor,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calcular itens visíveis
  const { visibleItems, totalHeight, offsetY } = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + height) / itemHeight) + overscan
    );

    const visibleItems = items.slice(startIndex, endIndex + 1).map((item, i) => ({
      item,
      index: startIndex + i,
      offsetY: (startIndex + i) * itemHeight,
    }));

    return {
      visibleItems,
      totalHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [items, itemHeight, scrollTop, height, overscan]);

  // Handler de scroll otimizado com requestAnimationFrame
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    requestAnimationFrame(() => {
      setScrollTop(target.scrollTop);
    });
  }, []);

  // Renderizar item individual memoizado
  const renderVisibleItem = useCallback(
    ({ item, index, offsetY }: { item: T; index: number; offsetY: number }) => (
      <div
        key={keyExtractor(item, index)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${itemHeight}px`,
          transform: `translateY(${offsetY}px)`,
        }}
      >
        {renderItem(item, index)}
      </div>
    ),
    [itemHeight, renderItem, keyExtractor]
  );

  return (
    <div
      ref={scrollContainerRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ position: 'relative', height: totalHeight, width: '100%' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(renderVisibleItem)}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook para detectar quando elementos entram na viewport
 * Útil para lazy loading de imagens e componentes pesados
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = {}
) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [ref, isInView] as const;
}

/**
 * Componente wrapper para lazy loading de conteúdo pesado
 */
export const LazyLoad = ({
  children,
  fallback = null,
  rootMargin = '100px',
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
}) => {
  const [ref, isInView] = useInView({ rootMargin });

  return (
    <div ref={ref} style={{ minHeight: '100px' }}>
      {isInView ? children : fallback}
    </div>
  );
};

/**
 * Componente de imagem com lazy loading e blur placeholder
 */
export const LazyImage = React.memo<{
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  placeholder?: string;
}>(({ src, alt, className = '', width, height, placeholder }) => {
  const [ref, isInView] = useInView({ rootMargin: '200px' });
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };

    img.onerror = () => {
      setIsLoading(false);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, isInView]);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={{ width, height, position: 'relative' }}
    >
      {isLoading && placeholder && (
        <div
          className="absolute inset-0 bg-muted animate-pulse"
          style={{ filter: 'blur(10px)' }}
        />
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';
