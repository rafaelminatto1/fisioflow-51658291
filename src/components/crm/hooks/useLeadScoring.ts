/**
 * Lead Scoring Hook - Migrated to Workers/Neon
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { crmApi, type Lead } from '@/lib/api/workers-client';

interface ScoreFactor {
  type: string;
  description: string;
  points: number;
}

export interface CalculatedLeadScore {
  leadId: string;
  totalScore: number;
  engagementScore: number;
  demographicScore: number;
  behavioralScore: number;
  factors: ScoreFactor[];
  category: 'hot' | 'warm' | 'cold';
}

function calculateLeadScore(lead: Lead): CalculatedLeadScore {
  let totalScore = 0;
  let engagementScore = 0;
  let demographicScore = 0;
  let behavioralScore = 0;
  const factors: ScoreFactor[] = [];

  if (lead.email) {
    demographicScore += 10;
    factors.push({ type: 'email', description: 'Possui email', points: 10 });
  }

  if (lead.telefone) {
    demographicScore += 15;
    factors.push({ type: 'phone', description: 'Possui telefone', points: 15 });
  }

  if (lead.origem === 'indicacao') {
    demographicScore += 20;
    factors.push({ type: 'source', description: 'Vindo de indicação', points: 20 });
  }

  if (lead.data_ultimo_contato) {
    engagementScore += 15;
    factors.push({ type: 'engagement', description: 'Contato recente registrado', points: 15 });
  }

  if (lead.interesse) {
    engagementScore += 10;
    factors.push({ type: 'interest', description: 'Interesse informado', points: 10 });
  }

  if (lead.estagio === 'avaliacao_agendada' || lead.estagio === 'avaliacao_realizada') {
    behavioralScore += 30;
    factors.push({ type: 'stage', description: 'Lead avançado no funil', points: 30 });
  } else if (lead.estagio === 'em_contato') {
    behavioralScore += 15;
    factors.push({ type: 'stage', description: 'Lead em contato', points: 15 });
  }

  totalScore = demographicScore + engagementScore + behavioralScore;

  return {
    leadId: lead.id,
    totalScore,
    engagementScore,
    demographicScore,
    behavioralScore,
    factors,
    category: totalScore >= 70 ? 'hot' : totalScore >= 40 ? 'warm' : 'cold',
  };
}

export async function fetchCalculatedLeadScores(leadId?: string) {
  const result = await crmApi.leads.list();
  const leads = result?.data ?? [];
  const filtered = leadId ? leads.filter((lead) => lead.id === leadId) : leads;
  return filtered.map(calculateLeadScore);
}

export function useLeadScoring() {
  const calculateScores = useMutation({
    mutationFn: async (leadId?: string) => fetchCalculatedLeadScores(leadId),
    onSuccess: () => {
      toast.success('Scores recalculados com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao calcular scores: ' + error.message);
    },
  });

  return { calculateScores };
}
