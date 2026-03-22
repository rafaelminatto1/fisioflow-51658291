/**
 * usePrevious Hook
 * Get previous value of a state or prop
 */

import { useRef, useEffect } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * useLatest Hook
 * Get latest value that doesn't change between renders
 */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  });

  return ref;
}
