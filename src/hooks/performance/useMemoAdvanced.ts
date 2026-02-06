/**
 * Hooks avançados de memoização para performance
 *
 * Coleção de hooks para memoizar valores, funções e componentes
 * evitando re-renders e recalculos desnecessários
 */


/**
 * Hook que mantém o valor anterior de um estado ou prop
 * Útil para comparações e detecção de mudanças
 *
 * @example
 * const prevCount = usePrevious(count);
 * if (count !== prevCount) {
 *   // count mudou
 * }
 */

import { useMemo, useRef, useCallback, useEffect, useState } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Hook que memoiza um valor mas também retorna se mudou desde a última renderização
 *
 * @example
 * const [value, didChange] = useTrackedMemo(() => computeExpensive(a, b), [a, b]);
 */
export function useTrackedMemo<T>(
  factory: () => T,
  deps: unknown[]
): [T, boolean] {
  const prevDepsRef = useRef<unknown[]>();
  const valueRef = useRef<T>();

  const depsChanged = !prevDepsRef.current ||
    deps.some((dep, i) => !Object.is(dep, prevDepsRef.current![i]));

  if (depsChanged) {
    valueRef.current = factory();
    prevDepsRef.current = deps;
  }

  return [valueRef.current, depsChanged];
}

/**
 * Hook que memoiza um valor com TTL (time-to-live)
 * Útil para cache de valores que podem ser recomputados após um tempo
 *
 * @example
 * const cachedData = useMemoWithTTL(() => fetchUserData(), [userId], 60000); // 1 minuto
 */
export function useMemoWithTTL<T>(
  factory: () => T,
  deps: unknown[],
  ttl: number // em ms
): T {
  const [value, setValue] = useState<T>(factory);
  const lastUpdateRef = useRef<number>(Date.now());
  const lastDepsRef = useRef<unknown[]>(deps);

  const depsChanged = !lastDepsRef.current ||
    deps.some((dep, i) => !Object.is(dep, lastDepsRef.current![i]));

  useEffect(() => {
    const now = Date.now();

    // Atualizar se deps mudou ou TTL expirou
    if (depsChanged || now - lastUpdateRef.current > ttl) {
      setValue(factory());
      lastUpdateRef.current = now;
      lastDepsRef.current = deps;
    }
  }, [deps, depsChanged, factory, ttl]);

  return value;
}

/**
 * Hook que cria uma função memoizada que mantém referência estável
 * mas pode ser "invalidada" manualmente quando necessário
 *
 * @example
 * const { callback, invalidate } = useInvalidableCallback(() => fetchData());
 */
export function useInvalidableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): { callback: T; invalidate: () => void; version: number } {
  const [version, setVersion] = useState(0);

  const memoizedCallback = useCallback(callback, [callback, version]);

  const invalidate = useCallback(() => {
    setVersion(v => v + 1);
  }, []);

  return { callback: memoizedCallback as T, invalidate, version };
}

/**
 * Hook que memoiza múltiplos valores de uma vez
 * Mais eficiente que vários useMemo separados
 *
 * @example
 * const [value1, value2, value3] = useMultiMemo([
 *   () => compute1(a, b),
 *   () => compute2(c, d),
 *   () => compute3(e, f)
 * ], [[a, b], [c, d], [e, f]]);
 */
export function useMultiMemo<T>(
  factories: (() => T)[],
  depsArrays: unknown[][]
): T[] {
  const flatDeps = useMemo(() => depsArrays.flat(), [depsArrays]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factories.map(factory => factory()), [factories, flatDeps]);
}

/**
 * Hook que mantém um valor em cache entre renderizações
 * Útil para valores caros que não dependem de props/state
 *
 * @example
 * const expensiveValue = usePersistentMemo(() => {
 *   const hugeArray = Array(10000).fill(0).map((_, i) => i * 2);
 *   return hugeArray;
 * });
 */
export function usePersistentMemo<T>(factory: () => T): T {
  const ref = useRef<T>();

  if (!ref.current) {
    ref.current = factory();
  }

  return ref.current;
}

/**
 * Hook que cria uma versão "throttled" de um valor
 * Atualiza no máximo uma vez a cada intervalo especificado
 *
 * @example
 * const throttledScroll = useThrottledValue(scrollY, 100);
 */
export function useThrottledValue<T>(value: T, interval: number = 100): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdatedRef = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdatedRef.current;

    if (timeSinceLastUpdate >= interval) {
      setThrottledValue(value);
      lastUpdatedRef.current = now;
    } else {
      const timeoutId = setTimeout(() => {
        setThrottledValue(value);
        lastUpdatedRef.current = Date.now();
      }, interval - timeSinceLastUpdate);

      return () => clearTimeout(timeoutId);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * Hook que memoiza o resultado de uma Promise
 * Útil para operações assíncronas custosas
 *
 * @example
 * const { data, loading, error } = usePromiseMemo(
 *   () => fetch('/api/data').then(r => r.json()),
 *   [url]
 * );
 */
export function usePromiseMemo<T>(
  promiseFactory: () => Promise<T>,
  deps: unknown[]
): { data: T | undefined; loading: boolean; error: Error | undefined } {
  const [state, setState] = useState<{
    data: T | undefined;
    loading: boolean;
    error: Error | undefined;
  }>({ data: undefined, loading: true, error: undefined });

  useEffect(() => {
    let cancelled = false;

    setState({ data: undefined, loading: true, error: undefined });

    promiseFactory()
      .then(data => {
        if (!cancelled) {
          setState({ data, loading: false, error: undefined });
        }
      })
      .catch(error => {
        if (!cancelled) {
          setState({ data: undefined, loading: false, error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [promiseFactory, deps]);

  return state;
}

/**
 * Hook que memoiza objetos usando deep comparison
 * Útil quando deps são objetos que podem ser recriados mas têm o mesmo conteúdo
 *
 * @example
 * const memoizedOptions = useDeepMemo(() => ({
 *   filter: complexFilter,
 *   sort: complexSort
 * }), [complexFilter, complexSort]);
 */
export function useDeepMemo<T>(factory: () => T, deps: unknown[]): T {
  const depsRef = useRef<unknown[]>();
  const valueRef = useRef<T>();

  const depsAreEqual = depsRef.current &&
    deps.length === depsRef.current.length &&
    deps.every((dep, i) => JSON.stringify(dep) === JSON.stringify(depsRef.current![i]));

  if (!depsAreEqual) {
    valueRef.current = factory();
    depsRef.current = deps;
  }

  return valueRef.current as T;
}

/**
 * Hook para memoizar componentes pesados com condições
 * Só renderiza se shouldRender for true
 *
 * @example
 * const ExpensiveComponent = useConditionalMemo(
 *   () => <VeryExpensiveComponent />,
 *   shouldShowExpensive
 * );
 */
export function useConditionalMemo<T>(
  factory: () => T,
  shouldRender: boolean
): T | null {
  return useMemo(() => (shouldRender ? factory() : null), [shouldRender, factory]);
}
