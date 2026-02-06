/**
 * Biblioteca inteligente para otimização de lista de espera
 * @module lib/waitlist/smart-waitlist
 */


// =====================================================================
// TYPES
// =====================================================================

import { addDays, format, isSameDay, parseISO, differenceInDays } from 'date-fns';
import { WaitlistEntry } from '@/hooks/useWaitlist';

export interface TimeSlot {
  date: Date;
  time: string;
  dateString: string;
  dayOfWeek: string;
  hour: number;
  period: 'morning' | 'afternoon' | 'evening';
}

export interface SlotCandidate {
  entry: WaitlistEntry;
  score: number;
  matchReasons: string[];
  priority: number;
  waitingDays: number;
}

export interface WaitlistRecommendation {
  slot: TimeSlot;
  candidates: SlotCandidate[];
  totalCandidates: number;
  urgencyLevel: 'low' | 'medium' | 'high';
}

export interface WaitlistAnalytics {
  totalWaiting: number;
  averageWaitTime: number;
  distributionByPriority: {
    urgent: number;
    high: number;
    normal: number;
  };
  distributionByDay: Record<string, number>;
  estimatedWaitTime: {
    urgent: number;
    high: number;
    normal: number;
  };
}

export interface TherapistAvailability {
  therapist_id: string;
  therapist_name: string;
  available_slots: Array<{
    date: string;
    time: string;
  }>;
}

// =====================================================================
// CONSTANTS
// =====================================================================

const PRIORITY_WEIGHTS = {
  urgent: 100,
  high: 50,
  normal: 10,
} as const;

const WAITING_TIME_WEIGHT = 2; // points per day
const REFUSAL_PENALTY = 20; // points per refusal
const PREFERRED_THERAPIST_BONUS = 35; // points for matching preferred therapist

const PERIODS = {
  morning: { start: 7, end: 12 },
  afternoon: { start: 12, end: 18 },
  evening: { start: 18, end: 21 },
} as const;

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// =====================================================================
// SLOT GENERATION
// =====================================================================

/**
 * Gera todos os slots disponíveis em um período
 */
export function generateAvailableSlots(
  startDate: Date,
  daysAhead: number = 14,
  blockedDates: Date[] = [],
  blockedTimes: Record<string, string[]> = {}
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const businessHours = { start: 7, end: 21 };
  const slotDuration = 30; // minutes

  for (let day = 0; day < daysAhead; day++) {
    const currentDate = addDays(startDate, day);
    const dateString = format(currentDate, 'yyyy-MM-dd');
    const dayOfWeek = DAY_NAMES[currentDate.getDay()];

    // Check if date is blocked
    if (blockedDates.some(d => isSameDay(d, currentDate))) {
      continue;
    }

    // Get blocked times for this date
    const blocked = blockedTimes[dateString] || [];

    for (let hour = businessHours.start; hour < businessHours.end; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

        // Check if time is blocked
        if (blocked.includes(time)) {
          continue;
        }

        let period: 'morning' | 'afternoon' | 'evening';
        if (hour < PERIODS.morning.end) period = 'morning';
        else if (hour < PERIODS.afternoon.end) period = 'afternoon';
        else period = 'evening';

        slots.push({
          date: currentDate,
          time,
          dateString,
          dayOfWeek,
          hour,
          period,
        });
      }
    }
  }

  return slots;
}

// =====================================================================
// CANDIDATE SCORING
// =====================================================================

/**
 * Calcula pontuação de compatibilidade para um candidato
 */
export function calculateCandidateScore(
  entry: WaitlistEntry,
  slot: TimeSlot,
  therapistAvailability?: TherapistAvailability[]
): SlotCandidate {
  const matchReasons: string[] = [];
  let score = 0;

  // Pontuação base por prioridade
  const priorityScore = PRIORITY_WEIGHTS[entry.priority];
  score += priorityScore;

  // Pontuação por tempo de espera
  const createdAt = parseISO(entry.created_at);
  const waitingDays = differenceInDays(new Date(), createdAt);
  score += waitingDays * WAITING_TIME_WEIGHT;

  // Penalidade por recusas anteriores
  score -= entry.refusal_count * REFUSAL_PENALTY;

  // Verificar compatibilidade de dia
  if (entry.preferred_days.includes(slot.dayOfWeek)) {
    score += 30;
    matchReasons.push('Dia compatível');
  }

  // Verificar compatibilidade de período
  if (entry.preferred_periods.includes(slot.period)) {
    score += 25;
    matchReasons.push('Período compatível');
  }

  // Bônus para urgência antiga
  if (entry.priority === 'urgent' && waitingDays > 3) {
    score += 40;
    matchReasons.push('Urgência aguardando há mais de 3 dias');
  }

  // Verificar terapeuta preferencial (se houver vaga disponível)
  if (entry.preferred_therapist_id && therapistAvailability) {
    const preferredTherapist = therapistAvailability.find(
      t => t.therapist_id === entry.preferred_therapist_id
    );

    if (preferredTherapist) {
      const isTherapistAvailable = preferredTherapist.available_slots.some(
        availableSlot => availableSlot.date === slot.dateString && availableSlot.time === slot.time
      );

      if (isTherapistAvailable) {
        score += PREFERRED_THERAPIST_BONUS;
        matchReasons.push(`Terapeuta preferencial disponível: ${preferredTherapist.therapist_name}`);
      }
    }
  }

  return {
    entry,
    score: Math.max(0, score),
    matchReasons,
    priority: priorityScore,
    waitingDays,
  };
}

/**
 * Encontra os melhores candidatos para um slot
 */
export function findCandidatesForSlot(
  waitlist: WaitlistEntry[],
  slot: TimeSlot,
  limit: number = 5,
  therapistAvailability?: TherapistAvailability[]
): SlotCandidate[] {
  const candidates = waitlist
    .filter(entry => {
      if (entry.status !== 'waiting') return false;
      if (entry.refusal_count >= 3) return false;

      // Verificar compatibilidade básica
      const dayMatch = entry.preferred_days.includes(slot.dayOfWeek);
      const periodMatch = entry.preferred_periods.includes(slot.period);

      return dayMatch || periodMatch;
    })
    .map(entry => calculateCandidateScore(entry, slot, therapistAvailability))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return candidates;
}

// =====================================================================
// SMART RECOMMENDATIONS
// =====================================================================

/**
 * Gera recomendações inteligentes para preencher vagas
 */
export function generateWaitlistRecommendations(
  waitlist: WaitlistEntry[],
  availableSlots: TimeSlot[],
  candidatesPerSlot: number = 3,
  therapistAvailability?: TherapistAvailability[]
): WaitlistRecommendation[] {
  const recommendations: WaitlistRecommendation[] = [];

  for (const slot of availableSlots) {
    const candidates = findCandidatesForSlot(waitlist, slot, candidatesPerSlot, therapistAvailability);

    if (candidates.length > 0) {
      // Calculate urgency level based on top candidate
      const topCandidate = candidates[0];
      let urgencyLevel: 'low' | 'medium' | 'high' = 'low';

      if (topCandidate.entry.priority === 'urgent' || topCandidate.waitingDays > 7) {
        urgencyLevel = 'high';
      } else if (topCandidate.entry.priority === 'high' || topCandidate.waitingDays > 3) {
        urgencyLevel = 'medium';
      }

      recommendations.push({
        slot,
        candidates,
        totalCandidates: candidates.length,
        urgencyLevel,
      });
    }
  }

  // Sort by urgency and number of candidates
  return recommendations.sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
  });
}

/**
 * Encontra a melhor vaga para um paciente específico
 */
export function findBestSlotForPatient(
  entry: WaitlistEntry,
  availableSlots: TimeSlot[],
  scheduledAppointments: Array<{ date: string; time: string; duration?: number }> = []
): TimeSlot | null {
  // Filter slots that match preferences
  const matchingSlots = availableSlots.filter(slot => {
    // Check day preference
    const dayMatch = entry.preferred_days.includes(slot.dayOfWeek);

    // Check period preference
    const periodMatch = entry.preferred_periods.includes(slot.period);

    // Check if slot is not already booked
    const isBooked = scheduledAppointments.some(apt => {
      return apt.date === slot.dateString && apt.time === slot.time;
    });

    return (dayMatch || periodMatch) && !isBooked;
  });

  if (matchingSlots.length === 0) return null;

  // Score each slot
  const scoredSlots = matchingSlots.map(slot => {
    let score = 0;

    // Exact day and period match
    if (entry.preferred_days.includes(slot.dayOfWeek)) score += 50;
    if (entry.preferred_periods.includes(slot.period)) score += 50;

    // Prefer sooner slots
    const daysUntilSlot = differenceInDays(slot.date, new Date());
    score -= daysUntilSlot * 2;

    // Prefer morning slots for high priority
    if (entry.priority === 'urgent' && slot.period === 'morning') {
      score += 20;
    }

    return { slot, score };
  });

  // Return best scoring slot
  scoredSlots.sort((a, b) => b.score - a.score);
  return scoredSlots[0].slot;
}

// =====================================================================
// ANALYTICS
// =====================================================================

/**
 * Gera analytics da lista de espera
 */
export function generateWaitlistAnalytics(waitlist: WaitlistEntry[]): WaitlistAnalytics {
  const waitingEntries = waitlist.filter(e => e.status === 'waiting');

  const distributionByPriority = {
    urgent: waitingEntries.filter(e => e.priority === 'urgent').length,
    high: waitingEntries.filter(e => e.priority === 'high').length,
    normal: waitingEntries.filter(e => e.priority === 'normal').length,
  };

  // Calculate average wait time
  const waitTimes = waitingEntries
    .map(e => differenceInDays(new Date(), parseISO(e.created_at)))
    .filter(d => d >= 0);

  const averageWaitTime = waitTimes.length > 0
    ? waitTimes.reduce((sum, d) => sum + d, 0) / waitTimes.length
    : 0;

  // Distribution by preferred day
  const distributionByDay: Record<string, number> = {};
  waitingEntries.forEach(entry => {
    entry.preferred_days.forEach(day => {
      distributionByDay[day] = (distributionByDay[day] || 0) + 1;
    });
  });

  // Estimated wait time by priority
  const countByPriority = distributionByPriority;
  const estimatedWaitTime = {
    urgent: countByPriority.urgent > 0 ? Math.ceil(countByPriority.urgent / 2) : 0,
    high: countByPriority.high > 0 ? Math.ceil(countByPriority.high / 3) : 0,
    normal: countByPriority.normal > 0 ? Math.ceil(countByPriority.normal / 5) : 0,
  };

  return {
    totalWaiting: waitingEntries.length,
    averageWaitTime: Math.round(averageWaitTime),
    distributionByPriority,
    distributionByDay,
    estimatedWaitTime,
  };
}

/**
 * Detecta anomalias na lista de espera
 */
export function detectWaitlistAnomalies(waitlist: WaitlistEntry[]): string[] {
  const anomalies: string[] = [];
  const waitingEntries = waitlist.filter(e => e.status === 'waiting');

  // Check for patients waiting too long
  const longWaiting = waitingEntries.filter(e => {
    const days = differenceInDays(new Date(), parseISO(e.created_at));
    return days > 14;
  });

  if (longWaiting.length > 0) {
    anomalies.push(`${longWaiting.length} pacientes aguardando há mais de 14 dias`);
  }

  // Check for high refusal count
  const highRefusal = waitingEntries.filter(e => e.refusal_count >= 2);
  if (highRefusal.length > 0) {
    anomalies.push(`${highRefusal.length} pacientes com 2 ou mais recusas`);
  }

  // Check for urgent patients
  const urgentCount = waitingEntries.filter(e => e.priority === 'urgent').length;
  if (urgentCount > 5) {
    anomalies.push(`${urgentCount} pacientes com prioridade urgente`);
  }

  return anomalies;
}

// =====================================================================
// SLOT OPTIMIZATION
// =====================================================================

/**
 * Otimiza a distribuição de vagas para pacientes
 */
export function optimizeSlotAllocation(
  waitlist: WaitlistEntry[],
  availableSlots: TimeSlot[]
): Map<string, TimeSlot> {
  const allocations = new Map<string, TimeSlot>();
  const remainingSlots = [...availableSlots];
  const remainingEntries = [...waitlist.filter(e => e.status === 'waiting')];

  // Sort entries by priority (urgent first)
  remainingEntries.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, normal: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by waiting time
    const daysA = differenceInDays(new Date(), parseISO(a.created_at));
    const daysB = differenceInDays(new Date(), parseISO(b.created_at));
    return daysB - daysA;
  });

  // Allocate slots
  for (const entry of remainingEntries) {
    if (remainingSlots.length === 0) break;

    const bestSlot = findBestSlotForPatient(entry, remainingSlots);
    if (bestSlot) {
      allocations.set(entry.id, bestSlot);

      // Remove allocated slot from remaining
      const slotIndex = remainingSlots.findIndex(
        s => s.dateString === bestSlot.dateString && s.time === bestSlot.time
      );
      if (slotIndex !== -1) {
        remainingSlots.splice(slotIndex, 1);
      }
    }
  }

  return allocations;
}

// =====================================================================
// EXPORTS
// =====================================================================

export default {
  generateAvailableSlots,
  calculateCandidateScore,
  findCandidatesForSlot,
  generateWaitlistRecommendations,
  findBestSlotForPatient,
  generateWaitlistAnalytics,
  detectWaitlistAnomalies,
  optimizeSlotAllocation,
};

// Export types for external use
export type {
  TimeSlot,
  SlotCandidate,
  WaitlistRecommendation,
  WaitlistAnalytics,
  TherapistAvailability,
};
