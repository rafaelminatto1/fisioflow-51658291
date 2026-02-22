/**
 * useIntersectionObserver - Hook para observar elementos na viewport
 *
 * Performance: Lazy loading e scroll tracking otimizados
 * - Intersection Observer API
 * - Threshold configurável
 * - Unobserve automático
 * - Suporte a root margin
 * - Multiple elements support
 */

import { useState, useEffect, useRef, useCallback, RefObject } from 'react';

interface IntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean; // Para de observar após primeira visibilidade
  triggerOnce?: boolean; // Alias para freezeOnceVisible
}

/**
 * useIntersectionObserver - Hook básico para um elemento
 */
export const useIntersectionObserver = (
  options: IntersectionObserverOptions = {}
): [RefObject<HTMLElement>, boolean] => {
  const { threshold = 0, rootMargin = '0%', freezeOnceVisible = false } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<HTMLElement>(null);
  const frozenRef = useRef(false);

  const updateEntry = useCallback(([entry]: IntersectionObserverEntry[]) => {
    if (entry.isIntersecting) {
      setIsIntersecting(true);

      if (freezeOnceVisible) {
        frozenRef.current = true;
      }
    } else if (!frozenRef.current) {
      setIsIntersecting(false);
    }
  }, [freezeOnceVisible]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || frozenRef.current) return;

    const observer = new IntersectionObserver(updateEntry, {
      threshold,
      rootMargin,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, updateEntry, freezeOnceVisible]);

  return [elementRef, isIntersecting];
};

// ============================================================================
// VARIANTE COM CALLBACK
// ============================================================================

interface IntersectionObserverCallbackOptions extends IntersectionObserverOptions {
  onChange?: (isIntersecting: boolean, entry: IntersectionObserverEntry) => void;
}

export const useIntersectionObserverCallback = (
  callback: (isIntersecting: boolean, entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverCallbackOptions = {}
): RefObject<HTMLElement> => {
  const { threshold = 0, rootMargin = '0%', triggerOnce = false } = options;

  const elementRef = useRef<HTMLElement>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasTriggeredRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;

        callback(isIntersecting, entry);

        if (isIntersecting && triggerOnce) {
          hasTriggeredRef.current = true;
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [callback, threshold, rootMargin, triggerOnce]);

  return elementRef;
};

// ============================================================================
// VARIANTE PARA MÚLTIPLOS ELEMENTOS
// ============================================================================

export const useMultipleIntersectionObserver = <T extends HTMLElement = HTMLElement>(
  count: number,
  options: IntersectionObserverOptions = {}
): RefObject<T>[] => {
  const { threshold = 0, rootMargin = '0%' } = options;
  const elementRefs = useRef<T[]>([]);
  const [intersectingIndices, setIntersectingIndices] = useState<Set<number>>(new Set());

  // Inicializar refs
  useEffect(() => {
    elementRefs.current = Array.from({ length: count }, () => null as T);
  }, [count]);

  useEffect(() => {
    const elements = elementRefs.current.filter(Boolean) as T[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setIntersectingIndices((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            const index = elementRefs.current.indexOf(entry.target as T);
            if (index !== -1) {
              if (entry.isIntersecting) {
                next.add(index);
              } else {
                next.delete(index);
              }
            }
          });
          return next;
        });
      },
      { threshold, rootMargin }
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [count, threshold, rootMargin]);

  return elementRefs.current.map((el, i) => ({
    current: el || null,
    isIntersecting: intersectingIndices.has(i),
  })) as any;
};

// ============================================================================
// VARIANTE COM PORCENTAGEM DE VISIBILIDADE
// ============================================================================

interface VisibilityResult {
  ref: RefObject<HTMLElement>;
  isVisible: boolean;
  visibilityRatio: number; // 0-1
}

export const useVisibilityRatio = (
  options: IntersectionObserverOptions = {}
): VisibilityResult => {
  const { threshold = Array.from({ length: 101 }, (_, i) => i / 100) } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [visibilityRatio, setVisibilityRatio] = useState(0);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        setVisibilityRatio(entry.intersectionRatio);
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return { ref: elementRef, isVisible, visibilityRatio };
};

// ============================================================================
// VARIANTE PARA INFINITE SCROLL
// ============================================================================

export const useInfiniteScroll = (
  callback: () => void,
  options: {
    threshold?: number;
    enabled?: boolean;
  } = {}
): RefObject<HTMLElement> => {
  const { threshold = 0.1, enabled = true } = options;
  const elementRef = useRef<HTMLElement>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          callback();

          // Reset para permitir próxima carga
          setTimeout(() => {
            hasTriggeredRef.current = false;
          }, 500);
        }
      },
      { threshold, rootMargin: '100px' }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [callback, threshold, enabled]);

  return elementRef;
};

// ============================================================================
// VARIANTE PARA DETECTAR QUANDO ELEMENTO SAI DA TELA
// ============================================================================

export const useOnScreenExit = (
  callback: () => void,
  options: IntersectionObserverOptions = {}
): RefObject<HTMLElement> => {
  const { threshold = 0, rootMargin = '0%' } = options;
  const elementRef = useRef<HTMLElement>(null);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (wasVisibleRef.current && !entry.isIntersecting) {
          callback();
        }
        wasVisibleRef.current = entry.isIntersecting;
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [callback, threshold, rootMargin]);

  return elementRef;
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Lazy loading de imagens
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [ref, isVisible] = useIntersectionObserver({ triggerOnce: true });
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    if (isVisible) {
      setImageSrc(src);
    }
  }, [isVisible, src]);

  return (
    <div ref={ref} style={{ minHeight: '200px' }}>
      {isVisible ? <img src={imageSrc} alt={alt} /> : <div>Loading...</div>}
    </div>
  );
}

// Example 2: Infinite scroll
function InfiniteList({ items, loadMore }: { items: any[]; loadMore: () => void }) {
  const loadMoreRef = useInfiniteScroll(loadMore, { threshold: 0.1 });

  return (
    <div>
      {items.map((item, i) => (
        <div key={i}>{item.name}</div>
      ))}
      <div ref={loadMoreRef}>Loading more...</div>
    </div>
  );
}

// Example 3: Rastrear visibilidade
function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  const { ref, isVisible, visibilityRatio } = useVisibilityRatio();

  return (
    <div ref={ref}>
      <p>Visibility: {(visibilityRatio * 100).toFixed(0)}%</p>
      {isVisible && <video src={videoUrl} autoPlay />}
    </div>
  );
}
*/
