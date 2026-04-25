/**
 * Hook para manter a agenda atualizada consultando o último `updated_at` das consultas.
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { appointmentsApi } from "@/api/v2";
import { fisioLogger as logger } from "@/lib/errors/logger";

export const useRealtimeAppointments = (enabled = true) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const lastTimestampRef = useRef<string | null>(null);
  const initialRunRef = useRef(true);

  useEffect(() => {
    if (!enabled || !user) return;

    let active = true;

    const poll = async () => {
      try {
        const res = await appointmentsApi.lastUpdated();
        if (!active) return;
        const next = res?.data?.last_updated_at ?? null;

        if (next && next !== lastTimestampRef.current) {
          lastTimestampRef.current = next;
          import("@/utils/cacheInvalidation").then(({ invalidateAppointmentsComprehensive }) => {
            invalidateAppointmentsComprehensive(queryClient);
          });
          if (!initialRunRef.current) {
            toast({
              title: "Agenda atualizada",
              description: "Novos dados sincronizados em tempo real.",
              duration: 2000,
            });
          }
        }
      } catch (error) {
        logger.debug("Erro no poll de agenda Realtime", error, "useRealtimeAppointments");
      } finally {
        initialRunRef.current = false;
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [enabled, user, queryClient, toast]);
};
