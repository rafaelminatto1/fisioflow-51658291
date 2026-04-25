/**
 * PosePreloadManager - Componente de infraestrutura para pré-carregamento
 *
 * Inicia o pré-carregamento do MediaPipe quando o usuário está logado.
 */

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePosePreload } from "@/hooks/ai/usePosePreload";
import { fisioLogger as logger } from "@/lib/errors/logger";

export const PosePreloadManager = () => {
  const { user } = useAuth();
  const { preload, isReady, isPreloading } = usePosePreload();

  useEffect(() => {
    // Inicia o pré-carregamento apenas se o usuário estiver logado
    // e o sistema ainda não estiver pronto ou carregando
    if (user && !isReady && !isPreloading) {
      // Delay maior e uso de requestIdleCallback para não competir com
      // o carregamento crítico de chunks da agenda e dashboard
      const timer = setTimeout(() => {
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          (window as any).requestIdleCallback(
            () => {
              logger.info(
                "[PosePreloadManager] Iniciando pré-carregamento em modo idle...",
                null,
                "PosePreload",
              );
              preload();
            },
            { timeout: 15000 },
          );
        } else {
          logger.info(
            "[PosePreloadManager] Iniciando pré-carregamento agendado...",
            null,
            "PosePreload",
          );
          preload();
        }
      }, 10000); // 10s de espera inicial

      return () => clearTimeout(timer);
    }
  }, [user, isReady, isPreloading, preload]);

  // Este componente não renderiza nada visualmente
  return null;
};
