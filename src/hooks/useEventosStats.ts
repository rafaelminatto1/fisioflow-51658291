/**
 * useEventosStats - Migrated to Neon/Workers
 */

import { useQuery } from "@tanstack/react-query";
import {
  eventosApi,
  participantesApi,
  financialApi,
  type Evento,
  type Participante,
  type Pagamento,
} from "@/api/v2";

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

async function fetchAllEventos() {
  const all: Evento[] = [];
  const limit = 500;
  let offset = 0;

  while (true) {
    const res = await eventosApi.list({ limit, offset });
    const chunk = (res?.data ?? []) as Evento[];
    all.push(...chunk);
    if (chunk.length < limit) break;
    offset += limit;
  }
  return all;
}

async function fetchAllParticipantes() {
  const all: Participante[] = [];
  const limit = 500;
  let offset = 0;

  while (true) {
    const res = await participantesApi.list({ limit, offset });
    const chunk = (res?.data ?? []) as Participante[];
    all.push(...chunk);
    if (chunk.length < limit) break;
    offset += limit;
  }
  return all;
}

async function fetchAllPagamentos() {
  const all: Pagamento[] = [];
  const limit = 500;
  let offset = 0;

  while (true) {
    const res = await financialApi.pagamentos.list({ limit, offset });
    const chunk = (res?.data ?? []) as Pagamento[];
    all.push(...chunk);
    if (chunk.length < limit) break;
    offset += limit;
  }
  return all;
}

export function useEventosStats() {
  return useQuery({
    queryKey: ["eventos-stats"],
    queryFn: async (): Promise<EventosStats> => {
      const [eventos, pagamentos, participantes] = await Promise.all([
        fetchAllEventos(),
        fetchAllPagamentos(),
        fetchAllParticipantes(),
      ]);

      const totalEventos = eventos.length;
      const eventosAtivos = eventos.filter(
        (e) => e.status === "AGENDADO" || e.status === "EM_ANDAMENTO" || e.status === "ativo",
      ).length;
      const eventosConcluidos = eventos.filter(
        (e) => e.status === "CONCLUIDO" || e.status === "concluido",
      ).length;

      let receitaTotal = 0;
      let custoTotal = 0;
      for (const pagamento of pagamentos) {
        const valor = Number(pagamento.valor || 0);
        const tipo = ((pagamento as unknown as { tipo?: string }).tipo ?? "").toLowerCase();
        if (tipo === "receita" || tipo === "entrada") {
          receitaTotal += valor;
        } else if (tipo) {
          custoTotal += Math.abs(valor);
        } else if (valor >= 0) {
          custoTotal += valor;
        } else {
          custoTotal += Math.abs(valor);
        }
      }

      const margemMedia =
        receitaTotal > 0 ? Math.round(((receitaTotal - custoTotal) / receitaTotal) * 100) : 0;

      const totalParticipantes = participantes.length;
      const mediaParticipantesPorEvento =
        totalEventos > 0 ? Math.round(totalParticipantes / totalEventos) : 0;
      const taxaConclusao =
        totalEventos > 0 ? Math.round((eventosConcluidos / totalEventos) * 100) : 0;

      return {
        totalEventos,
        eventosAtivos,
        eventosConcluidos,
        taxaConclusao,
        receitaTotal,
        custoTotal,
        margemMedia,
        totalParticipantes,
        mediaParticipantesPorEvento,
      };
    },
    refetchInterval: 30000,
  });
}
