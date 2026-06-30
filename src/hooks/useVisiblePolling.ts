import { useEffect, useRef } from "react";

/**
 * Executa `callback` em intervalo regular, mas SOMENTE quando a aba está visível
 * (`document.visibilityState === "visible"`). Ao reabrir a aba dispara o callback
 * imediatamente. Evita chatter/refetch e wakeups inúteis do Neon em abas ocultas,
 * sobretudo quando já existe um WebSocket (RealtimeContext) cuidando do tempo real.
 *
 * O callback é lido via ref para não reagendar o intervalo a cada render.
 */
export function useVisiblePolling(
  callback: () => void,
  intervalMs: number,
  enabled = true,
): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const isVisible = () =>
      typeof document === "undefined" || document.visibilityState === "visible";

    const interval = window.setInterval(() => {
      if (isVisible()) cbRef.current();
    }, intervalMs);

    const onVisible = () => {
      if (isVisible()) cbRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs, enabled]);
}
