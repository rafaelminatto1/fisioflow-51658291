/**
 * useRealtimeEventos - Migrated to Neon/Workers (polling)
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { eventosApi, type Evento } from "@/api/v2";

export function useRealtimeEventos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    let previousIds = new Set<string>();
    let isFirstPoll = true;

    const poll = async () => {
      try {
        const res = await eventosApi.list({ limit: 50, offset: 0 });
        const eventos = (res?.data ?? []) as Evento[];
        const currentIds = new Set(eventos.map((e) => e.id));

        if (!isFirstPoll) {
          for (const evento of eventos) {
            if (!previousIds.has(evento.id)) {
              logger.info(
                "Novo evento detectado por polling",
                { eventId: evento.id },
                "useRealtimeEventos",
              );
              toast({
                title: "🎉 Novo evento criado",
                description: `${evento.nome} foi adicionado`,
              });
            }
          }

          const removedCount = [...previousIds].filter((id) => !currentIds.has(id)).length;
          if (removedCount > 0) {
            logger.info(
              "Evento removido detectado por polling",
              { removedCount },
              "useRealtimeEventos",
            );
            toast({
              title: "Evento removido",
              description: "Um evento foi excluído",
              variant: "destructive",
            });
          }
        }

        previousIds = currentIds;
        isFirstPoll = false;
        queryClient.invalidateQueries({ queryKey: ["eventos"] });
        queryClient.invalidateQueries({ queryKey: ["eventos-stats"] });
      } catch (error) {
        logger.error("Erro no polling de eventos", error, "useRealtimeEventos");
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 30000);
    return () => window.clearInterval(interval);
  }, [queryClient, toast]);
}
