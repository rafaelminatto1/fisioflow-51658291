import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';

export interface ProgressAlert {
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  recommendation?: string;
}

export interface ProgressMetrics {
  improvementRate: number;
  sessionsCount: number;
  daysSinceStart: number;
  averagePainReduction: number;
  mobilityImprovement: number;
  isStagnant: boolean;
  trend: 'improving' | 'stable' | 'declining';
}

export const useProgressAnalysis = (sessions: Array<{
  date: string;
  painLevel: number;
  mobilityScore: number;
}>) => {
  const analysis = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return null;
    }

    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstSession = sortedSessions[0];
    const lastSession = sortedSessions[sortedSessions.length - 1];
    const recentSessions = sortedSessions.slice(-5); // Últimas 5 sessões

    // Calcular métricas básicas
    const daysSinceStart = differenceInDays(
      new Date(lastSession.date),
      new Date(firstSession.date)
    ) || 1;

    const initialPain = firstSession.painLevel;
    const currentPain = lastSession.painLevel;
    const painReduction = ((initialPain - currentPain) / initialPain) * 100;

    const initialMobility = firstSession.mobilityScore;
    const currentMobility = lastSession.mobilityScore;
    const mobilityImprovement = ((currentMobility - initialMobility) / initialMobility) * 100;

    // Calcular taxa de melhora média por sessão
    let totalImprovement = 0;
    for (let i = 1; i < sortedSessions.length; i++) {
      const improvement = sortedSessions[i - 1].painLevel - sortedSessions[i].painLevel;
      totalImprovement += improvement;
    }
    const averageImprovementPerSession = sortedSessions.length > 1 
      ? totalImprovement / (sortedSessions.length - 1)
      : 0;

    // Detectar estagnação (últimas 3 sessões sem melhora significativa)
    let isStagnant = false;
    if (recentSessions.length >= 3) {
      const recentVariation = Math.abs(
        recentSessions[recentSessions.length - 1].painLevel - 
        recentSessions[recentSessions.length - 3].painLevel
      );
      isStagnant = recentVariation < 0.5; // Menos de 0.5 pontos de mudança
    }

    // Determinar tendência
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentSessions.length >= 2) {
      const recentAvg = recentSessions.slice(-2).reduce((sum, s) => sum + s.painLevel, 0) / 2;
      const previousAvg = recentSessions.slice(0, 2).reduce((sum, s) => sum + s.painLevel, 0) / 2;
      
      if (recentAvg < previousAvg - 0.5) trend = 'improving';
      else if (recentAvg > previousAvg + 0.5) trend = 'declining';
    }

    const metrics: ProgressMetrics = {
      improvementRate: averageImprovementPerSession,
      sessionsCount: sortedSessions.length,
      daysSinceStart,
      averagePainReduction: painReduction,
      mobilityImprovement,
      isStagnant,
      trend,
    };

    // Gerar alertas e recomendações
    const alerts: ProgressAlert[] = [];

    // Alerta de progresso excelente
    if (painReduction > 50 && mobilityImprovement > 30) {
      alerts.push({
        type: 'success',
        title: 'Excelente Progresso!',
        message: `O paciente apresentou ${painReduction.toFixed(0)}% de redução na dor e ${mobilityImprovement.toFixed(0)}% de melhora na mobilidade.`,
        recommendation: 'Continue o tratamento atual. Considere iniciar exercícios mais avançados.'
      });
    }

    // Alerta de estagnação
    if (isStagnant && sortedSessions.length >= 5) {
      alerts.push({
        type: 'warning',
        title: 'Possível Estagnação Detectada',
        message: 'O paciente não apresentou melhora significativa nas últimas 3 sessões.',
        recommendation: 'Reavalie o plano de tratamento. Considere ajustar condutas ou encaminhar para especialista.'
      });
    }

    // Alerta de piora
    if (trend === 'declining') {
      alerts.push({
        type: 'danger',
        title: 'Tendência de Piora',
        message: 'Os níveis de dor do paciente estão aumentando nas sessões recentes.',
        recommendation: 'Investigue possíveis causas: execução incorreta de exercícios, sobrecarga, nova lesão. Considere pausar atividades de alto impacto.'
      });
    }

    // Alerta de recuperação rápida
    if (daysSinceStart <= 30 && painReduction > 40) {
      alerts.push({
        type: 'success',
        title: 'Recuperação Acelerada',
        message: `Progresso excepcional em apenas ${daysSinceStart} dias.`,
        recommendation: 'Paciente responde bem ao tratamento. Mantenha motivação alta e considere aumentar gradualmente a intensidade.'
      });
    }

    // Alerta de tratamento prolongado
    if (daysSinceStart > 90 && painReduction < 30) {
      alerts.push({
        type: 'warning',
        title: 'Tratamento Prolongado',
        message: `Após ${daysSinceStart} dias, a melhora está abaixo do esperado.`,
        recommendation: 'Considere reavaliação completa, exames complementares ou interconsulta com médico especialista.'
      });
    }

    // Alerta informativo de marco
    if (sortedSessions.length === 10) {
      alerts.push({
        type: 'info',
        title: 'Marco Alcançado',
        message: '10ª sessão concluída. Momento ideal para reavaliação completa.',
        recommendation: 'Agende reavaliação com testes padronizados (Oswestry, Lysholm) e atualize metas de tratamento.'
      });
    }

    return { metrics, alerts };
  }, [sessions]);

  return analysis;
};
