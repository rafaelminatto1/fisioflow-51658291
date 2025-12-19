import { useRef, useEffect, useState, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | null;
  freezeOnceVisible?: boolean;
}

/**
 * Hook para Intersection Observer
 * Útil para lazy loading, infinite scroll, e animações on-scroll
 */
export function useIntersectionObserver<T extends Element>(
  options: UseIntersectionObserverOptions = {}
): [RefObject<T>, boolean] {
  const { threshold = 0, rootMargin = '0px', root = null, freezeOnceVisible = false } = options;
  
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If already visible and should freeze, don't observe
    if (freezeOnceVisible && isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);

        // If visible and should freeze, disconnect
        if (visible && freezeOnceVisible) {
          observer.disconnect();
        }
      },
      { threshold, rootMargin, root }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, root, freezeOnceVisible, isVisible]);

  return [ref, isVisible];
}

/**
 * Hook para lazy loading de componentes
 * Renderiza placeholder até o elemento entrar na viewport
 */
export function useLazyRender(rootMargin: string = '100px'): [RefObject<HTMLDivElement>, boolean] {
  return useIntersectionObserver<HTMLDivElement>({
    rootMargin,
    freezeOnceVisible: true,
  });
}

/**
 * Hook para infinite scroll
 * Dispara callback quando o elemento sentinela é visível
 */
export function useInfiniteScroll(
  callback: () => void,
  options: { enabled?: boolean; rootMargin?: string } = {}
): RefObject<HTMLDivElement> {
  const { enabled = true, rootMargin = '100px' } = options;
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
    rootMargin,
    freezeOnceVisible: false,
  });

  useEffect(() => {
    if (isVisible && enabled) {
      callback();
    }
  }, [isVisible, enabled, callback]);

  return ref;
}

/**
 * Hook para animação on-scroll
 * Retorna true quando o elemento entra na viewport
 */
export function useAnimateOnScroll(
  threshold: number = 0.1,
  rootMargin: string = '0px'
): [RefObject<HTMLDivElement>, boolean] {
  return useIntersectionObserver<HTMLDivElement>({
    threshold,
    rootMargin,
    freezeOnceVisible: true,
  });
}
