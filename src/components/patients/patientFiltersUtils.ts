
/**
 * Filtros disponíveis para busca de pacientes
 */

import type { PatientStats } from '@/hooks/usePatientStats';

export type PatientFilters = {
  classification?: PatientStats['classification'] | 'all';
  sessionsRange?: [number, number];
  hasUnpaid?: boolean;
  hasNoShow?: boolean;
  hasUpcoming?: boolean;
  daysInactive?: number;
  minSessionsCompleted?: number;
};

/**
 * Conta quantos filtros estão ativos
 * @param filters - Objeto com os filtros ativos
 * @returns Número de filtros ativos
 */
export function countActiveFilters(filters: PatientFilters): number {
  let count = 0;
  if (filters.classification && filters.classification !== 'all') count++;
  if (filters.hasUnpaid) count++;
  if (filters.hasNoShow) count++;
  if (filters.hasUpcoming) count++;
  if (filters.daysInactive && filters.daysInactive > 0) count++;
  if (filters.minSessionsCompleted) count++;
  return count;
}

/**
 * Verifica se um paciente corresponde aos filtros aplicados
 * @param patientId - ID do paciente a ser verificado
 * @param filters - Objeto com os filtros ativos
 * @param statsMap - Mapa de estatísticas dos pacientes
 * @returns true se o paciente corresponde aos filtros, false caso contrário
 */
export function matchesFilters(
  patientId: string,
  filters: PatientFilters,
  statsMap: Record<string, PatientStats>
): boolean {
  const stats = statsMap[patientId];
  if (!stats) return true; // Se não tem stats, não filtra

  // Classificação
  if (filters.classification && filters.classification !== 'all') {
    if (stats.classification !== filters.classification) return false;
  }

  // Sessões não pagas
  if (filters.hasUnpaid && stats.unpaidSessionsCount === 0) return false;

  // No-show
  if (filters.hasNoShow && stats.noShowCount === 0) return false;

  // Agendamentos futuros
  if (filters.hasUpcoming && stats.upcomingAppointmentsCount === 0) return false;

  // Dias inativo
  if (filters.daysInactive && stats.daysSinceLastAppointment < filters.daysInactive) {
    return false;
  }

  // Mínimo de sessões completadas
  if (filters.minSessionsCompleted && stats.sessionsCompleted < filters.minSessionsCompleted) {
    return false;
  }

  // Range de sessões
  if (filters.sessionsRange) {
    const [min, max] = filters.sessionsRange;
    if (stats.sessionsCompleted < min || stats.sessionsCompleted > max) {
      return false;
    }
  }

  return true;
}
