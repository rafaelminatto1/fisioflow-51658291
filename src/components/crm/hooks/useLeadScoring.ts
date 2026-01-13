import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScoreFactor {
  type: string;
  description: string;
  points: number;
}

export function useLeadScoring() {
  const calculateScores = useMutation({
    mutationFn: async (_leadId?: string) => {
      // Buscar leads
      const { data: leads } = await supabase
        .from('leads')
        .select('*');

      if (!leads) return;

      // Buscar interações (comunicações, agendamentos, etc)
      const { data: interacoes } = await supabase
        .from('lead_interacoes')
        .select('*');

      // Regras de pontuação são buscadas para garantir que existam no banco
      await supabase
        .from('lead_scoring_regras')
        .select('*')
        .eq('active', true)
        .maybeSingle();

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
          factors.push({ type: 'source', description: 'Veio de indicação', points: 20 });
        } else if (lead.source === 'google') {
          demographicScore += 10;
          factors.push({ type: 'source', description: 'Veio do Google', points: 10 });
        }

        // Pontuação de engajamento
        const leadInteracoes = interacoes?.filter(i => i.lead_id === lead.id) || [];
        if (leadInteracoes.length > 0) {
          engagementScore += Math.min(leadInteracoes.length * 5, 25);
          factors.push({ type: 'interacoes', description: `${leadInteracoes.length} interações`, points: Math.min(leadInteracoes.length * 5, 25) });
        }

        // Verificar respostas rápidas
        const quickResponses = leadInteracoes.filter((i: Record<string, unknown>) => {
          if (!i.created_at || !lead.created_at) return false;
          const responseTime = new Date(i.created_at as string).getTime() - new Date(lead.created_at as string).getTime();
          return responseTime < 24 * 60 * 60 * 1000; // Respondeu em menos de 24h
        });
        if (quickResponses.length > 0) {
          engagementScore += quickResponses.length * 5;
          factors.push({ type: 'resposta_rapida', description: 'Respondeu rapidamente', points: quickResponses.length * 5 });
        }

        // Pontuação comportamental
        if (lead.stage === 'avaliacao') {
          behavioralScore += 20;
          factors.push({ type: 'stage', description: 'Em avaliação', points: 20 });
        } else if (lead.stage === 'prospecacao') {
          behavioralScore += 10;
        } else if (lead.stage === 'efetivado') {
          behavioralScore += 30;
          factors.push({ type: 'stage', description: 'Cliente efetivado', points: 30 });
        }

        // Antiguidade do lead
        const daysSinceCreation = (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 7) {
          behavioralScore += 15;
          factors.push({ type: 'recencia', description: 'Lead recente', points: 15 });
        } else if (daysSinceCreation > 30) {
          behavioralScore -= 10;
          factors.push({ type: 'recencia', description: 'Lead antigo', points: -10 });
        }

        totalScore = engagementScore + demographicScore + behavioralScore;
        totalScore = Math.max(0, Math.min(100, totalScore)); // Limitar entre 0 e 100

        // Determinar tier
        let tier: 'hot' | 'warm' | 'cold' = 'cold';
        if (totalScore >= 70) tier = 'hot';
        else if (totalScore >= 40) tier = 'warm';

        return {
          lead_id: lead.id,
          total_score: totalScore,
          engagement_score: engagementScore,
          demographic_score: demographicScore,
          behavioral_score: behavioralScore,
          tier,
          factors,
        };
      });

      // Salvar no banco
      for (const score of calculatedScores) {
        await supabase
          .from('lead_scores')
          .upsert({
            ...score,
            last_calculated: new Date().toISOString(),
          });
      }

      return calculatedScores;
    },
    onSuccess: () => {
      toast.success('Scores calculados com sucesso!');
    },
  });

  return { calculateScores };
}
