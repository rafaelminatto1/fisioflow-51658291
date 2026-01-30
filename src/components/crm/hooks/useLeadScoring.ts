/**
 * Lead Scoring Hook - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('leads') → Firestore collection 'leads'
 * - supabase.from('lead_interacoes') → Firestore collection 'lead_interacoes'
 * - supabase.from('lead_scoring_regras') → Firestore collection 'lead_scoring_regras'
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';


interface ScoreFactor {
  type: string;
  description: string;
  points: number;
}

export function useLeadScoring() {
  const calculateScores = useMutation({
    mutationFn: async (_leadId?: string) => {
      // Buscar leads
      const leadsQ = query(collection(db, 'leads'));
      const leadsSnapshot = await getDocs(leadsQ);
      const leads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (leads.length === 0) return [];

      // Buscar interações (comunicações, agendamentos, etc.)
      const interacoesQ = query(collection(db, 'lead_interacoes'));
      const interacoesSnapshot = await getDocs(interacoesQ);
      const interacoes = interacoesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Regras de pontuação
      const regrasQ = query(
        collection(db, 'lead_scoring_regras'),
        where('active', '==', true)
      );
      const regrasSnapshot = await getDocs(regrasQ);
      const regras = regrasSnapshot.docs.length > 0 ? regrasSnapshot.docs[0].data() : null;

      const calculatedScores = leads.map(lead => {
        let totalScore = 0;
        let engagementScore = 0;
        let demographicScore = 0;
        let behavioralScore = 0;
        const factors: ScoreFactor[] = [];

        // Pontuação demográfica
        if (lead.email) {
          demographicScore += 10;
          factors.push({ type: 'email', description: 'Possui email', points: 10 });
        }
        if (lead.phone) {
          demographicScore += 15;
          factors.push({ type: 'phone', description: 'Possui telefone', points: 15 });
        }
        if (lead.source === 'indicacao') {
          demographicScore += 20;
          factors.push({ type: 'source', description: 'Vindo de indicação', points: 20 });
        }

        // Pontuação por engajamento
        const leadInteracoes = interacoes.filter(i => i.lead_id === lead.id);
        if (leadInteracoes.length > 0) {
          engagementScore += Math.min(leadInteracoes.length * 5, 25);
          factors.push({ type: 'engagement', description: `${leadInteracoes.length} interações`, points: Math.min(leadInteracoes.length * 5, 25) });
        }

        // Pontuação comportamental
        if (lead.status === 'hot') {
          behavioralScore += 30;
          factors.push({ type: 'status', description: 'Lead quente', points: 30 });
        } else if (lead.status === 'warm') {
          behavioralScore += 15;
          factors.push({ type: 'status', description: 'Lead morno', points: 15 });
        }

        totalScore = demographicScore + engagementScore + behavioralScore;

        return {
          leadId: lead.id,
          totalScore,
          engagementScore,
          demographicScore,
          behavioralScore,
          factors,
          category: totalScore >= 70 ? 'hot' : totalScore >= 40 ? 'warm' : 'cold'
        };
      });

      return calculatedScores;
    },
    onSuccess: () => {
      toast.success('Scores calculados com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao calcular scores: ' + error.message);
    },
  });

  return { calculateScores };
}
