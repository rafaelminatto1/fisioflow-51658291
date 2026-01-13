/**
 * LazyRenderList - Componente de lista com lazy rendering
 * Renderiza itens conforme eles entram na viewport
 * Simples e eficiente para listas moderadas (até ~1000 itens)
 *
 * @example
 * <LazyRenderList
 *   items={items}
 *   renderItem={(item) => <Card>{item.name}</Card>}
 *   keyExtractor={(item) => item.id}
 *   batchSize={20}
 * />
 */

import { useState, useRef, useCallback, useEffect, memo } from 'react';

interface LazyRenderListProps<T> {
  /** Lista completa de itens */
  items: T[];
  /** Render function para cada item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Key extractor para cada item */
  keyExtractor: (item: T, index: number) => string;
  /** Número de itens para renderizar por vez */
  batchSize?: number;
  /** ClassName para o container */
  className?: string;
  /** Render function para header */
  renderHeader?: () => React.ReactNode;
  /** Render function para footer */
  renderFooter?: () => React.ReactNode;
  /** Render function para item vazio */
  renderEmpty?: () => React.ReactNode;
  /** Render function para trigger "carregar mais" */
  renderLoadMore?: (onLoadMore: () => void) => React.ReactNode;
  /** Threshold para carregar mais itens (0 a 1) */
  threshold?: number;
}

/**
 * Trigger para detectar quando usuário chegou ao final da lista
 */
const LoadMoreTrigger = memo(function LoadMoreTrigger({
  onLoadMore,
  threshold = 0.1,
  disabled = false,
}: {
  onLoadMore: () => void;
  threshold?: number;
  disabled?: boolean;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (disabled || hasLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasLoaded) {
          setHasLoaded(true);
          onLoadMore();
        }
      },
      { threshold }
    );

    const current = triggerRef.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [disabled, hasLoaded, onLoadMore, threshold]);

  return <div ref={triggerRef} className="h-1" />;
});

export function LazyRenderList<T>({
  items,
  renderItem,
  keyExtractor,
  batchSize = 20,
  className,
  renderHeader,
  renderFooter,
  renderEmpty,
  renderLoadMore,
  threshold = 0.1,
}: LazyRenderListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoading, setIsLoading] = useState(false);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const handleLoadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    // Simular delay para suavidade
    await new Promise(resolve => setTimeout(resolve, 100));

    setVisibleCount(prev => Math.min(prev + batchSize, items.length));
    setIsLoading(false);
  }, [isLoading, hasMore, batchSize, items.length]);

  // Reset quando items mudar drasticamente
  useEffect(() => {
    setVisibleCount(batchSize);
  }, [items.length, batchSize]);

  if (items.length === 0) {
    return renderEmpty ? (
      <div className={className}>
        {renderEmpty()}
      </div>
    ) : null;
  }

  return (
    <div className={className}>
      {renderHeader?.()}

      <div className="space-y-2">
        {visibleItems.map((item, index) => (
          <div key={keyExtractor(item, index)}>
            {renderItem(item, index)}
          </div>
        ))}

        {hasMore && (
          <>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm">Carregando...</span>
                </div>
              </div>
            ) : renderLoadMore ? (
              renderLoadMore(handleLoadMore)
            ) : (
              <LoadMoreTrigger
                onLoadMore={handleLoadMore}
                threshold={threshold}
                disabled={isLoading}
              />
            )}
          </>
        )}
      </div>

      {renderFooter?.()}
    </div>
  );
}

/**
 * Versão mais simples que renderiza itens em chunks
 */
export function ChunkedList<T>({
  items,
  renderItem,
  keyExtractor,
  chunkSize = 50,
  className,
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  chunkSize?: number;
  className?: string;
}) {
  const [visibleChunks, setVisibleChunks] = useState(1);
  const triggerRef = useRef<HTMLDivElement>(null);

  const totalChunks = Math.ceil(items.length / chunkSize);
  const visibleItems = items.slice(0, visibleChunks * chunkSize);
  const hasMore = visibleChunks < totalChunks;

  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const current = triggerRef.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [hasMore, visibleChunks]);

  return (
    <div className={className}>
      <div className="space-y-2">
        {visibleItems.map((item, index) => (
          <div key={keyExtractor(item, index)}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {hasMore && (
        <div ref={triggerRef} className="py-4 text-center text-muted-foreground text-sm">
          Carregando mais itens...
        </div>
      )}
    </div>
  );
}

export default LazyRenderList;
