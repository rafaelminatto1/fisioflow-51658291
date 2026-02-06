/**
 * Serviço de recomendações inteligentes usando IA
 * @module lib/ai/recommendations
 */


// =====================================================================
// TYPES
// =====================================================================

import { format, differenceInDays, differenceInWeeks } from 'date-fns';

export interface PatientRecommendation {
  type: 'follow_up' | 'reschedule' | 'treatment_adjustment' | 'risk_alert';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  patientId: string;
  patientName: string;
  suggestedAction?: string;
  confidence: number; // 0-1
  factors: string[];
}

export interface ScheduleRecommendation {
  type: 'optimal_slot' | 'therapist_match' | 'time_adjustment';
  title: string;
  description: string;
  suggestedDate?: string;
  suggestedTime?: string;
  suggestedTherapist?: string;
  confidence: number;
  reason: string;
}

export interface TreatmentInsight {
  type: 'progress' | 'stagnation' | 'regression' | 'milestone';
  title: string;
  description: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  recommendation?: string;
}

// =====================================================================
// PATIENT RECOMMENDATIONS
// =====================================================================

interface PatientData {
  id: string;
  name: string;
  lastAppointment?: string;
  appointmentCount: number;
  averageGapDays?: number;
  condition?: string;
  status?: 'active' | 'inactive' | 'at_risk';
  missedAppointments?: number;
  completedAppointments?: number;
  painLevelHistory?: Array<{ date: string; level: number }>;
  evolutionScores?: Array<{ date: string; score: number }>;
}

/**
 * Gera recomendações para um paciente
 */
export function generatePatientRecommendations(
  patient: PatientData
): PatientRecommendation[] {
  const recommendations: PatientRecommendation[] = [];
  const today = new Date();

  // Check for missed appointments (high priority)
  if (patient.missedAppointments && patient.missedAppointments >= 2) {
    recommendations.push({
      type: 'risk_alert',
      priority: 'high',
      title: 'Alta taxa de ausências',
      description: `${patient.name} perdeu ${patient.missedAppointments} agendamentos recentes. Considere entrar em contato.`,
      patientId: patient.id,
      patientName: patient.name,
      suggestedAction: 'Entrar em contato via telefone/WhatsApp',
      confidence: 0.85,
      factors: ['Faltas consecutivas', 'Histórico de não comparecimento'],
    });
  }

  // Check for follow-up needed
  if (patient.lastAppointment) {
    const daysSinceLastAppointment = differenceInDays(today, new Date(patient.lastAppointment));
    const avgGap = patient.averageGapDays || 14; // Default to 2 weeks

    if (daysSinceLastAppointment > avgGap * 1.5) {
      recommendations.push({
        type: 'follow_up',
        priority: daysSinceLastAppointment > avgGap * 2 ? 'high' : 'medium',
        title: 'Retorno necessário',
        description: `${patient.name} está há ${daysSinceLastAppointment} dias sem comparecer. Intervalo médio esperado: ${avgGap} dias.`,
        patientId: patient.id,
        patientName: patient.name,
        suggestedAction: 'Agendar nova sessão',
        confidence: 0.9,
        factors: ['Tempo desde última consulta', 'Intervalo médio histórico'],
      });
    }
  }

  // Check pain level trend
  if (patient.painLevelHistory && patient.painLevelHistory.length >= 3) {
    const recent = patient.painLevelHistory.slice(-3);
    const trend = recent[2].level - recent[0].level;

    if (trend > 2) {
      recommendations.push({
        type: 'treatment_adjustment',
        priority: 'high',
        title: 'Aumento de dor detectado',
        description: `Nível de dor aumentou de ${recent[0].level} para ${recent[2].level} nas últimas 3 sessões.`,
        patientId: patient.id,
        patientName: patient.name,
        suggestedAction: 'Revisar plano de tratamento',
        confidence: 0.8,
        factors: ['Tendência de dor crescente', 'Últimas 3 sessões'],
      });
    } else if (trend < -2) {
      recommendations.push({
        type: 'follow_up',
        priority: 'low',
        title: 'Melhora significativa',
        description: `Nível de dor diminuiu de ${recent[0].level} para ${recent[2].level}.`,
        patientId: patient.id,
        patientName: patient.name,
        suggestedAction: 'Considerar reduzir frequência de sessões',
        confidence: 0.75,
        factors: ['Tendência de dor decrescente', 'Progresso positivo'],
      });
    }
  }

  // Check evolution progress
  if (patient.evolutionScores && patient.evolutionScores.length >= 3) {
    const recent = patient.evolutionScores.slice(-3);
    const trend = recent[2].score - recent[0].score;

    if (Math.abs(trend) < 2) {
      recommendations.push({
        type: 'treatment_adjustment',
        priority: 'medium',
        title: 'Progresso estagnado',
        description: `Pontuação de evolução permaneceu estável nas últimas sessões.`,
        patientId: patient.id,
        patientName: patient.name,
        suggestedAction: 'Avaliar necessidade de ajuste no tratamento',
        confidence: 0.7,
        factors: ['Ausência de progresso significativo', 'Estagnação'],
      });
    }
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Gera recomendações para múltiplos pacientes
 */
export function generateBulkPatientRecommendations(
  patients: PatientData[]
): PatientRecommendation[] {
  return patients.flatMap(patient => generatePatientRecommendations(patient));
}

// =====================================================================
// SCHEDULE RECOMMENDATIONS
// =====================================================================

interface AppointmentRequest {
  patientId: string;
  patientName: string;
  condition?: string;
  preferredDays?: string[];
  preferredTimes?: string[];
  duration?: number;
  urgency?: 'low' | 'medium' | 'high';
  lastTherapistId?: string;
}

interface SlotAvailability {
  date: string;
  time: string;
  available: boolean;
  therapistId?: string;
  therapistName?: string;
}

/**
 * Encontra os melhores horários para um agendamento
 */
export function findOptimalSlots(
  request: AppointmentRequest,
  availableSlots: SlotAvailability[],
  therapists: Array<{ id: string; name: string; specialties?: string[] }>
): ScheduleRecommendation[] {
  const recommendations: ScheduleRecommendation[] = [];

  // Filter available slots
  const available = availableSlots.filter(s => s.available);

  // Score each slot
  const scoredSlots = available.map(slot => {
    let score = 0;
    const reasons: string[] = [];

    // Check day preference
    const dayOfWeek = new Date(slot.date).getDay();
    const dayName = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'][dayOfWeek];
    if (request.preferredDays?.includes(dayName)) {
      score += 30;
      reasons.push('Dia preferido pelo paciente');
    }

    // Check time preference
    if (request.preferredTimes) {
      const hour = parseInt(slot.time.split(':')[0]);
      const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      if (request.preferredTimes.includes(period)) {
        score += 25;
        reasons.push('Horário preferido pelo paciente');
      }
    }

    // Check therapist match
    if (request.lastTherapistId && slot.therapistId === request.lastTherapistId) {
      score += 40;
      reasons.push('Mesmo terapeuta das sessões anteriores');
    } else if (slot.therapistId) {
      const therapist = therapists.find(t => t.id === slot.therapistId);
      if (therapist?.specialties?.includes(request.condition || '')) {
        score += 35;
        reasons.push('Terapeuta especializado na condição');
      }
    }

    // Consider urgency
    if (request.urgency === 'high') {
      // Prefer sooner slots for urgent cases
      const daysUntilSlot = differenceInDays(new Date(slot.date), new Date());
      score -= daysUntilSlot * 2;
      reasons.push('Caso de alta prioridade');
    }

    return {
      slot,
      score,
      reasons: reasons.join(', ') || 'Horário disponível',
    };
  });

  // Get top 3 recommendations
  const topSlots = scoredSlots
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return topSlots.map((item, index) => ({
    type: 'optimal_slot',
    title: `Opção ${index + 1} de horário`,
    description: item.reasons,
    suggestedDate: item.slot.date,
    suggestedTime: item.slot.time,
    suggestedTherapist: item.slot.therapistName,
    confidence: Math.min(1, item.score / 100),
    reason: item.reasons,
  }));
}

// =====================================================================
// TREATMENT INSIGHTS
// =====================================================================

interface EvolutionData {
  patientId: string;
  patientName: string;
  scores: Array<{ date: string; score: number; type?: string }>;
  goals?: Array<{
    id: string;
    title: string;
    target: number;
    current: number;
    deadline?: string;
  }>;
}

/**
 * Gera insights sobre o progresso do tratamento
 */
export function generateTreatmentInsights(
  data: EvolutionData
): TreatmentInsight[] {
  const insights: TreatmentInsight[] = [];
  const { scores, goals } = data;

  if (scores.length < 2) {
    return [{
      type: 'progress',
      title: 'Dados insuficientes',
      description: 'Mais dados de evolução são necessários para gerar insights',
      value: 0,
      trend: 'stable',
    }];
  }

  // Overall progress trend
  const firstScore = scores[0].score;
  const lastScore = scores[scores.length - 1].score;
  const overallChange = lastScore - firstScore;

  let trend: 'up' | 'down' | 'stable';
  if (overallChange > 5) trend = 'up';
  else if (overallChange < -5) trend = 'down';
  else trend = 'stable';

  insights.push({
    type: trend === 'up' ? 'progress' : trend === 'down' ? 'regression' : 'stagnation',
    title: 'Progresso Geral',
    description: `Pontuação evolu${trend === 'up' ? 'iu' : trend === 'down' ? 'ui' : ' permaneceu estável'} de ${firstScore} para ${lastScore}`,
    value: overallChange,
    trend,
    recommendation: trend === 'up'
      ? 'Continuar com o tratamento atual'
      : trend === 'down'
      ? 'Revisar plano de tratamento'
      : 'Considerar ajustes para retomar progresso',
  });

  // Recent trend (last 5 sessions)
  const recentScores = scores.slice(-5);
  if (recentScores.length >= 3) {
    const recentChange = recentScores[recentScores.length - 1].score - recentScores[0].score;

    if (Math.abs(recentChange) > 3) {
      insights.push({
        type: recentChange > 0 ? 'progress' : 'regression',
        title: 'Tendência Recente',
        description: `Nas últimas ${recentScores.length} sessões: ${recentChange > 0 ? '+' : ''}${recentChange.toFixed(1)} pontos`,
        value: recentChange,
        trend: recentChange > 0 ? 'up' : recentChange < 0 ? 'down' : 'stable',
      });
    }
  }

  // Goal progress
  if (goals && goals.length > 0) {
    goals.forEach(goal => {
      const progress = (goal.current / goal.target) * 100;

      if (progress >= 100) {
        insights.push({
          type: 'milestone',
          title: 'Meta Atingida!',
          description: `${goal.title}: ${goal.current}/${goal.target} (${progress.toFixed(0)}%)`,
          value: progress,
          trend: 'up',
          recommendation: 'Definir nova meta',
        });
      } else if (progress >= 80) {
        insights.push({
          type: 'progress',
          title: 'Quase lá!',
          description: `${goal.title}: ${goal.current}/${goal.target} (${progress.toFixed(0)}%)`,
          value: progress,
          trend: 'up',
        });
      } else if (goal.deadline) {
        const daysUntilDeadline = differenceInDays(new Date(goal.deadline), new Date());
        if (daysUntilDeadline < 0 && progress < 100) {
          insights.push({
            type: 'stagnation',
            title: 'Meta não atingida',
            description: `${goal.title}: ${goal.current}/${goal.target} (prazo ultrapassado)`,
            value: progress,
            trend: 'down',
            recommendation: 'Revisar meta ou plano de tratamento',
          });
        }
      }
    });
  }

  // Check for milestones (every 10 points)
  const milestone = Math.floor(lastScore / 10) * 10;
  if (lastScore >= milestone && lastScore - 10 < milestone) {
    insights.push({
      type: 'milestone',
      title: 'Marconia Atingida!',
      description: `Pontuação alcançou ${milestone} pontos`,
      value: lastScore,
      trend: 'up',
      recommendation: 'Celebrar progresso com o paciente',
    });
  }

  return insights;
}

// =====================================================================
// SMART APPOINTMENT SUGGESTIONS
// =====================================================================

interface AppointmentHistory {
  date: string;
  time: string;
  therapistId: string;
  duration: number;
  type?: string;
}

/**
 * Sugere melhor data/hora para próximo agendamento
 */
export function suggestNextAppointment(
  history: AppointmentHistory[]
): { suggestedDate: Date; suggestedTime: string; confidence: number; reason: string } | null {
  if (history.length === 0) return null;

  // Calculate average gap
  const sortedDates = history.map(h => new Date(h.date)).sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];

  for (let i = 1; i < sortedDates.length; i++) {
    gaps.push(differenceInDays(sortedDates[i], sortedDates[i - 1]));
  }

  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;

  // Find most common time
  const timeCounts = new Map<string, number>();
  history.forEach(h => {
    timeCounts.set(h.time, (timeCounts.get(h.time) || 0) + 1);
  });

  const mostCommonTime = Array.from(timeCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  // Find most common day of week
  const dayCounts = new Map<number, number>();
  history.forEach(h => {
    const day = new Date(h.date).getDay();
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  });

  const mostCommonDay = Array.from(dayCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  // Calculate suggested date
  const lastAppointment = sortedDates[sortedDates.length - 1];
  const suggestedDate = new Date(lastAppointment);
  suggestedDate.setDate(suggestedDate.getDate() + Math.round(avgGap));

  // Adjust to most common day of week
  const currentDay = suggestedDate.getDay();
  if (mostCommonDay !== undefined && mostCommonDay !== currentDay) {
    const daysToAdd = (mostCommonDay - currentDay + 7) % 7;
    suggestedDate.setDate(suggestedDate.getDate() + daysToAdd);
  }

  const confidence = Math.min(1, (history.length / 10) + 0.5);

  return {
    suggestedDate,
    suggestedTime: mostCommonTime || '09:00',
    confidence,
    reason: `Baseado em ${history.length} agendamentos anteriores (intervalo médio: ${Math.round(avgGap)} dias)`,
  };
}

// =====================================================================
// EXPORTS
// =====================================================================

export default {
  generatePatientRecommendations,
  generateBulkPatientRecommendations,
  findOptimalSlots,
  generateTreatmentInsights,
  suggestNextAppointment,
};
