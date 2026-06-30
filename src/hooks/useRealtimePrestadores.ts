/**
 * Hook to keep prestadores data fresh by polling the Worker metrics endpoint.
 */

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { prestadoresApi } from "@/api/v2";
import { useVisiblePolling } from "@/hooks/useVisiblePolling";
import { fisioLogger as logger } from "@/lib/errors/logger";

export function useRealtimePrestadores(eventoId: string) {
  const queryClient = useQueryClient();
  const lastUpdatedRef = useRef<string | null>(null);

  const pollMetrics = useCallback(async () => {
    if (!eventoId) return;
    try {
      const res = await prestadoresApi.metrics(eventoId);
      const nextUpdated = res?.data?.last_updated_at ?? null;
      if (!nextUpdated) return;
      if (nextUpdated !== lastUpdatedRef.current) {
        lastUpdatedRef.current = nextUpdated;
        queryClient.invalidateQueries({
          queryKey: ["prestadores", eventoId],
        });
        queryClient.invalidateQueries({ queryKey: ["eventos-stats"] });
      }
    } catch (error) {
      logger.error("Error polling prestadores metrics", error as Error, "useRealtimePrestadores");
    }
  }, [eventoId, queryClient]);

  // Primeira leitura ao montar / trocar de evento.
  useEffect(() => {
    if (!eventoId) return;
    void pollMetrics();
  }, [eventoId, pollMetrics]);

  // Poll periódico — só com a aba visível (evita acordar o Neon em segundo plano).
  useVisiblePolling(() => void pollMetrics(), 15000, !!eventoId);
}
