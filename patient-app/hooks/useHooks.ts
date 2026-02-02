/**
 * Utility Hooks
 * Collection of helpful custom hooks
 */

import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * useFirstRender Hook
 * Check if component is in first render
 */
export function useFirstRender(): boolean {
  const firstRender = useRef(true);

  useEffect(() => {
    firstRender.current = false;
  }, []);

  return firstRender.current;
}

/**
 * useIsMounted Hook
 * Check if component is mounted
 */
export function useIsMounted(): () => boolean {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return () => isMounted.current;
}

/**
 * useInterval Hook
 * Wrapper around setInterval
 */
export function useInterval(
  callback: () => void,
  delay: number | null,
  immediate: boolean = false
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    if (immediate) {
      savedCallback.current();
    }

    const tick = () => savedCallback.current();
    const id = setInterval(tick, delay);

    return () => clearInterval(id);
  }, [delay, immediate]);
}

/**
 * useTimeout Hook
 * Wrapper around setTimeout
 */
export function useTimeout(
  callback: () => void,
  delay: number | null
): () => void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setTimeout(() => savedCallback.current(), delay);

    return () => clearTimeout(id);
  }, [delay]);

  // Return a cancel function
  return useCallback(() => {
    // This is a placeholder - the actual cleanup happens in the useEffect
  }, []);
}

/**
 * useToggle Hook
 * Toggle boolean state
 */
export function useToggle(initialValue: boolean = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(v => !v), []);
  const setToggle = useCallback((v: boolean) => setValue(v), []);

  return [value, toggle, setToggle];
}

/**
 * useArray Hook
 * Helper for array state operations
 */
export function useArray<T>(initialValue: T[] = []) {
  const [array, setArray] = useState<T[]>(initialValue);

  const push = useCallback((...items: T[]) => {
    setArray(prev => [...prev, ...items]);
  }, []);

  const unshift = useCallback((...items: T[]) => {
    setArray(prev => [...items, ...prev]);
  }, []);

  const pop = useCallback(() => {
    setArray(prev => prev.slice(0, -1));
  }, []);

  const shift = useCallback(() => {
    setArray(prev => prev.slice(1));
  }, []);

  const filter = useCallback((callback: (item: T, index: number) => boolean) => {
    setArray(prev => prev.filter(callback));
  }, []);

  const map = useCallback(<U extends T>(callback: (item: T, index: number) => U) => {
    setArray(prev => prev.map(callback) as U[]);
  }, []);

  const removeByIndex = useCallback((index: number) => {
    setArray(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => {
    setArray([]);
  }, []);

  return {
    array,
    setArray,
    push,
    unshift,
    pop,
    shift,
    filter,
    map,
    removeByIndex,
    clear,
  };
}

/**
 * useCounter Hook
 * Helper for counter state
 */
export function useCounter(initialValue: number = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback((step: number = 1) => {
    setCount(prev => prev + step);
  }, []);

  const decrement = useCallback((step: number = 1) => {
    setCount(prev => prev - step);
  }, []);

  const reset = useCallback((value: number = initialValue) => {
    setCount(value);
  }, [initialValue]);

  const setValue = useCallback((value: number) => {
    setCount(value);
  }, []);

  return {
    count,
    setCount: setValue,
    increment,
    decrement,
    reset,
  };
}
