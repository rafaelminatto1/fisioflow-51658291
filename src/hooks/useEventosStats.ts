import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EventosStats {
  totalEventos: number;
  eventosAtivos: number;
  eventosConcluidos: number;
  taxaConclusao: number;
  receitaTotal: number;
  custoTotal: number;
  margemMedia: number;
  totalParticipantes: number;
  mediaParticipantesPorEvento: number;
}

export function useEventosStats() {
  return useQuery({
    queryKey: ["eventos-stats"],
    queryFn: async (): Promise<EventosStats> => {
      const { data: eventos, error: eventosError } = await supabase
        .from("eventos")
        .select("id, status");

      if (eventosError) throw eventosError;

      const totalEventos = eventos?.length || 0;
      const eventosAtivos = eventos?.filter(
        (e) => e.status === "AGENDADO" || e.status === "EM_ANDAMENTO"
      ).length || 0;
      const eventosConcluidos = eventos?.filter(
        (e) => e.status === "CONCLUIDO"
      ).length || 0;

      const { data: pagamentos, error: pagamentosError } = await supabase
        .from("pagamentos")
        .select("valor, tipo");

      if (pagamentosError) throw pagamentosError;

      const receitaTotal = pagamentos
        ?.filter((p) => p.tipo === "receita")
        .reduce((sum, p) => sum + Number(p.valor || 0), 0) || 0;

      const custoTotal = pagamentos
        ?.filter((p) => p.tipo !== "receita")
        .reduce((sum, p) => sum + Number(p.valor || 0), 0) || 0;

      const margemMedia = receitaTotal > 0
        ? Math.round(((receitaTotal - custoTotal) / receitaTotal) * 100)
        : 0;

      const { count: totalParticipantes, error: participantesError } = await supabase
        .from("participantes")
        .select("*", { count: "exact", head: true });

      if (participantesError) throw participantesError;

      const mediaParticipantesPorEvento = totalEventos > 0
        ? Math.round((totalParticipantes || 0) / totalEventos)
        : 0;

      const taxaConclusao = totalEventos > 0
        ? Math.round((eventosConcluidos / totalEventos) * 100)
        : 0;

      return {
        totalEventos,
        eventosAtivos,
        eventosConcluidos,
        taxaConclusao,
        receitaTotal,
        custoTotal,
        margemMedia,
        totalParticipantes: totalParticipantes || 0,
        mediaParticipantesPorEvento,
      };
    },
    refetchInterval: 30000,
  });
}
