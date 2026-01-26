/**
 * useEventosStats - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from("eventos") → Firestore collection 'eventos'
 * - supabase.from("pagamentos") → Firestore collection 'pagamentos'
 * - supabase.from("participantes") → Firestore collection 'participantes'
 */

import { useQuery } from "@tanstack/react-query";
import { getFirebaseDb } from "@/integrations/firebase/app";
import { collection, getDocs, getCountFromServer, query, where } from "firebase/firestore";

const db = getFirebaseDb();

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
      const eventosQ = query(collection(db, "eventos"));
      const eventosSnap = await getDocs(eventosQ);
      const eventos = eventosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const totalEventos = eventos.length;
      const eventosAtivos = eventos.filter(
        (e: any) => e.status === "AGENDADO" || e.status === "EM_ANDAMENTO"
      ).length;
      const eventosConcluidos = eventos.filter(
        (e: any) => e.status === "CONCLUIDO"
      ).length;

      // Fetch pagamentos
      const pagamentosQ = query(collection(db, "pagamentos"));
      const pagamentosSnap = await getDocs(pagamentosQ);
      const pagamentos = pagamentosSnap.docs.map(doc => doc.data());

      const receitaTotal = pagamentos
        .filter((p: any) => p.tipo === "receita")
        .reduce((sum, p: any) => sum + Number(p.valor || 0), 0);

      const custoTotal = pagamentos
        .filter((p: any) => p.tipo !== "receita")
        .reduce((sum, p: any) => sum + Number(p.valor || 0), 0);

      const margemMedia = receitaTotal > 0
        ? Math.round(((receitaTotal - custoTotal) / receitaTotal) * 100)
        : 0;

      // Count participantes
      const participantesQ = query(collection(db, "participantes"));
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
