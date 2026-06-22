import { useEffect, useRef } from "react";
import type { TabSaveHandle } from "./types";

/**
 * Registra o handle de save da aba no shell de forma estável.
 *
 * `save`/`discard` mudam de identidade a cada render (dependem de mutations e
 * do draft atual). Registrá-los direto num efeito faria o efeito disparar a
 * cada render → setState no shell → re-render → loop infinito. Aqui as closures
 * vão por ref e o efeito só re-executa quando os campos primitivos mudam.
 */
export function useRegisterTabHandle(
  registerHandle: (handle: TabSaveHandle | null) => void,
  state: {
    isDirty: boolean;
    isSaving: boolean;
    lastSavedAt: Date | null;
    save: () => void;
    discard: () => void;
  },
) {
  const saveRef = useRef(state.save);
  const discardRef = useRef(state.discard);
  saveRef.current = state.save;
  discardRef.current = state.discard;

  const { isDirty, isSaving, lastSavedAt } = state;

  useEffect(() => {
    registerHandle({
      isDirty,
      isSaving,
      lastSavedAt,
      save: () => saveRef.current(),
      discard: () => discardRef.current(),
    });
    return () => registerHandle(null);
  }, [isDirty, isSaving, lastSavedAt, registerHandle]);
}
