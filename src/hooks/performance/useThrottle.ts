
/**
 * Hook para throttle de valores
 * Limita a frequência de atualização de um valor
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export function useThrottle<T>(value: T, limit: number = 100): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    
    if (now - lastRan.current >= limit) {
      setThrottledValue(value);
      lastRan.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }, limit - (now - lastRan.current));

      return () => clearTimeout(timer);
    }
  }, [value, limit]);

  return throttledValue;
}

/**
 * Hook para throttle de callbacks
 * Limita a frequência de execução de uma função
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number = 100
): (...args: Parameters<T>) => void {
  const lastRan = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRan.current >= limit) {
        callback(...args);
        lastRan.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRan.current = Date.now();
        }, limit - (now - lastRan.current));
      }
    },
    [callback, limit]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

/**
 * Hook para throttle de eventos de scroll
 * Otimizado para eventos de scroll frequentes
 */
export function useScrollThrottle(
  callback: (scrollY: number) => void,
  limit: number = 100
): void {
  const throttledCallback = useThrottledCallback(callback, limit);

  useEffect(() => {
    const handleScroll = () => {
      throttledCallback(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [throttledCallback]);
}

/**
 * Hook para throttle de resize
 * Útil para responsividade
 */
export function useResizeThrottle(
  callback: (width: number, height: number) => void,
  limit: number = 200
): void {
  const throttledCallback = useThrottledCallback(callback, limit);

  useEffect(() => {
    const handleResize = () => {
      throttledCallback(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Call immediately
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [throttledCallback]);
}
