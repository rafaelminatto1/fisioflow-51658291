/**
 * useThrottle - Hook para throttling de funções
 *
 * Performance: Limita execução de funções
 * - Configurável (delay em ms)
 * - Leading edge opcional (executa imediatamente)
 * - Trailing edge opcional (executa no final)
 * - Cleanup automático
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface ThrottleOptions {
  delay: number;
  leading?: boolean; // Executa na primeira chamada
  trailing?: boolean; // Executa na última chamada após delay
}

/**
 * useThrottle - Throttle de valor
 */
export const useThrottle = <T>(value: T, delay: number): T => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      setThrottledValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
};

/**
 * useThrottleFn - Throttle de função
 */
export const useThrottleFn = <T extends (...args: any[]) => any>(
  fn: T,
  options: ThrottleOptions
): T => {
  const { delay, leading = true, trailing = true } = options;

  const lastExecuted = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const argsRef = useRef<any[]>();

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastExec = now - lastExecuted.current;
      argsRef.current = args;

      // Executar imediatamente se leading e não executou recentemente
      if (leading && timeSinceLastExec >= delay) {
        lastExecuted.current = now;
        fn(...args);
        return;
      }

      // Cancelar timeout anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Agendar execução (trailing)
      if (trailing) {
        timeoutRef.current = setTimeout(() => {
          if (argsRef.current) {
            fn(...argsRef.current);
          }
          lastExecuted.current = Date.now();
          timeoutRef.current = null;
        }, delay - timeSinceLastExec);
      }
    },
    [fn, delay, leading, trailing]
  ) as T;

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
};

/**
 * useThrottleCallback - Versão simplificada de throttle de callback
 */
export const useThrottleCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  return useThrottleFn(callback, { delay, leading: true, trailing: true });
};

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

/**
 * throttle - Função throttle standalone
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T => {
  const { leading = true, trailing = true } = options;
  let lastExecuted = 0;
  let timeoutRef: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs = args;

    if (leading && now - lastExecuted >= delay) {
      lastExecuted = now;
      return fn(...args);
    }

    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }

    if (trailing) {
      timeoutRef = setTimeout(() => {
        if (lastArgs) {
          fn(...lastArgs);
        }
        lastExecuted = Date.now();
        timeoutRef = null;
      }, delay - (now - lastExecuted));
    }
  }) as T;
};

/**
 * requestAnimationFrameThrottle - Throttle usando rAF para animações
 */
export const requestAnimationFrameThrottle = <T extends (...args: any[]) => any>(
  fn: T
): T => {
  let lastArgs: Parameters<T> | null = null;
  let rafId: number | null = null;

  return ((...args: Parameters<T>) => {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          fn(...lastArgs);
        }
        rafId = null;
      });
    }
  }) as T;
};

/**
 * useRAFThrottle - Hook para throttle com requestAnimationFrame
 */
export const useRAFThrottle = <T extends (...args: any[]) => any>(
  callback: T
): T => {
  return requestAnimationFrameThrottle(callback);
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Throttle de valor (útil para inputs de scroll)
function ScrollComponent() {
  const [scrollY, setScrollY] = useState(0);

  const throttledScrollY = useThrottle(scrollY, 100);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return <div>Scroll: {throttledScrollY}</div>;
}

// Example 2: Throttle de função
function ButtonComponent() {
  const handleClick = useThrottleFn(() => {
    console.log('Clicked!');
  }, { delay: 500 });

  return <button onClick={handleClick}>Click me</button>;
}

// Example 3: Throttle com rAF para animações
function AnimationComponent() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useRAFThrottle((e: MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
  });

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return <div style={{ position: 'absolute', left: position.x, top: position.y }} />;
}
*/
