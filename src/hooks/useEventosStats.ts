/**
 * useEventosStats - Migrated to Firebase
 */

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, getCountFromServer, query as firestoreQuery, db } from '@/integrations/firebase/app';
import { normalizeFirestoreData } from '@/utils/firestoreData';

interface Evento {
  id: string;
  status?: string;
  [key: string]: unknown;
}

interface Pagamento {
  tipo?: string;
  valor?: string | number;
  [key: string]: unknown;
}

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
      // Fetch eventos
      const eventosQ = firestoreQuery(collection(db, "eventos"));
      const eventosSnap = await getDocs(eventosQ);
      const eventos = eventosSnap.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));

      const totalEventos = eventos.length;
      const eventosAtivos = eventos.filter(
        (e: Evento) => e.status === "AGENDADO" || e.status === "EM_ANDAMENTO"
      ).length;
      const eventosConcluidos = eventos.filter(
        (e: Evento) => e.status === "CONCLUIDO"
      ).length;

      // Fetch pagamentos
      const pagamentosQ = firestoreQuery(collection(db, "pagamentos"));
      const pagamentosSnap = await getDocs(pagamentosQ);
      const pagamentos = pagamentosSnap.docs.map(doc => normalizeFirestoreData(doc.data()));

      const receitaTotal = pagamentos
        .filter((p: Pagamento) => p.tipo === "receita")
        .reduce((sum, p: Pagamento) => sum + Number(p.valor || 0), 0);

      const custoTotal = pagamentos
        .filter((p: Pagamento) => p.tipo !== "receita")
        .reduce((sum, p: Pagamento) => sum + Number(p.valor || 0), 0);

      const margemMedia = receitaTotal > 0
        ? Math.round(((receitaTotal - custoTotal) / receitaTotal) * 100)
        : 0;

      // Count participantes
      const participantesQ = firestoreQuery(collection(db, "participantes"));
      const participantesSnap = await getCountFromServer(participantesQ);
      const totalParticipantes = participantesSnap.data().count;

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