/**
 * Hook customizado para setInterval com cleanup automático
 */

import { useEffect, useRef } from 'react';

export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null || delay === 0) {
      return;
    }

    const id = setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => clearInterval(id);
  }, [delay]);
}

export function useTimeout(callback: () => void, delay: number | null): void {
  useEffect(() => {
    if (delay === null || delay === 0) {
      return;
    }

    const id = setTimeout(() => {
      callback();
    }, delay);

    return () => clearTimeout(id);
  }, [callback, delay]);
}
