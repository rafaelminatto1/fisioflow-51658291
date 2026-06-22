import { useCallback, useMemo, useRef, useState } from "react";

export function useTabDirtyState<T>(initial: T) {
  const baselineRef = useRef<string>(JSON.stringify(initial));
  const [value, setValueState] = useState<T>(initial);

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    setValueState((prev) =>
      typeof next === "function" ? (next as (p: T) => T)(prev) : next,
    );
  }, []);

  const reset = useCallback((next?: T | ((prev: T) => T)) => {
    // Sem argumento = descartar: restaura o último baseline (não aceita o draft atual).
    if (next === undefined) {
      setValueState(JSON.parse(baselineRef.current) as T);
      return;
    }
    setValueState((prev) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      baselineRef.current = JSON.stringify(resolved);
      return resolved;
    });
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(value) !== baselineRef.current,
    [value],
  );

  return { value, setValue, isDirty, reset };
}
