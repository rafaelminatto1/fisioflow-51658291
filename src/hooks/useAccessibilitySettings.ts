import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

interface AccessibilityState {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: "small" | "medium" | "large";
}

const STORAGE_KEY = "accessibility-settings";

const DEFAULT_STATE: AccessibilityState = {
  highContrast: false,
  reducedMotion: false,
  fontSize: "medium",
};

function loadState(): AccessibilityState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AccessibilityState>;
    return {
      highContrast: !!parsed.highContrast,
      reducedMotion: !!parsed.reducedMotion,
      fontSize:
        parsed.fontSize === "small" || parsed.fontSize === "medium" || parsed.fontSize === "large"
          ? parsed.fontSize
          : "medium",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function applyToDOM(state: AccessibilityState) {
  document.documentElement.classList.toggle("high-contrast", state.highContrast);
  document.documentElement.classList.toggle("reduced-motion", state.reducedMotion);
  document.documentElement.classList.remove("text-small", "text-medium", "text-large");
  document.documentElement.classList.add(`text-${state.fontSize}`);
}

export function useAccessibilitySettings() {
  const [state, setState] = useState<AccessibilityState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    applyToDOM(state);
  }, [state]);

  const setHighContrast = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, highContrast: value }));
    toast({
      title: value ? "Alto contraste ativado" : "Alto contraste desativado",
    });
  }, []);

  const setReducedMotion = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, reducedMotion: value }));
    toast({
      title: value ? "Movimento reduzido ativado" : "Movimento reduzido desativado",
    });
  }, []);

  const setFontSize = useCallback((value: "small" | "medium" | "large") => {
    setState((prev) => ({ ...prev, fontSize: value }));
    toast({
      title:
        value === "large"
          ? "Texto grande ativado"
          : value === "small"
            ? "Texto pequeno ativado"
            : "Texto normal ativado",
    });
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
    toast({ title: "Acessibilidade restaurada ao padrão" });
  }, []);

  return {
    ...state,
    setHighContrast,
    setReducedMotion,
    setFontSize,
    reset,
  };
}
