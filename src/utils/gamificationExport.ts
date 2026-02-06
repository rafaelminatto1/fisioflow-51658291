
/**
 * Export leaderboard data to CSV
 */

import { downloadCSV } from './csvExport';
import { LeaderboardEntry, EngagementData } from '@/types/gamification';

export const exportLeaderboardToCSV = (data: LeaderboardEntry[]): void => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = ['Posição', 'Paciente', 'Email', 'Nível', 'XP Total', 'Streak Atual', 'Streak Recorde', 'Conquistas', 'Última Atividade'];

  const rows = data.map(entry => {
    const lastActivity = entry.last_activity
      ? new Date(entry.last_activity).toLocaleString('pt-BR')
      : 'Nunca';

    return [
      entry.rank || '',
      `"${(entry.patient_name || '').replace(/"/g, '""')}"`,
      entry.email || '',
      entry.level,
      entry.total_xp,
      entry.current_streak,
      entry.longest_streak,
      entry.achievements_count,
      `"${lastActivity}"`,
    ].join(';');
  });

  const csv = [headers.join(';'), ...rows].join('\n');
  const filename = `ranking_gamificacao_${new Date().toISOString().split('T')[0]}.csv`;

  downloadCSV(csv, filename);
};

/**
 * Export engagement data to CSV
 */
export const exportEngagementToCSV = (data: EngagementData[]): void => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = ['Data', 'Pacientes Ativos', 'Missões Concluídas', 'XP Distribuído', 'Conquistas Desbloqueadas'];

  const rows = data.map(entry => {
    const date = new Date(entry.date).toLocaleDateString('pt-BR');

    return [
      `"${date}"`,
      entry.activePatients,
      entry.questsCompleted,
      entry.xpAwarded,
      entry.achievementsUnlocked,
    ].join(';');
  });

  const csv = [headers.join(';'), ...rows].join('\n');
  const filename = `engajamento_gamificacao_${new Date().toISOString().split('T')[0]}.csv`;

  downloadCSV(csv, filename);
};

/**
 * Generate CSV content for at-risk patients
 */
export const generateAtRiskPatientsCSV = (patients: Array<{
  patient_name: string;
  email?: string;
  level: number;
  lastActivity: string;
  daysInactive: number;
}>): string => {
  const headers = ['Paciente', 'Email', 'Nível', 'Última Atividade', 'Dias Inativo'];

  const rows = patients.map(p => {
    const lastActivity = p.lastActivity
      ? new Date(p.lastActivity).toLocaleDateString('pt-BR')
      : 'Nunca';

    return [
      `"${(p.patient_name || '').replace(/"/g, '""')}"`,
      p.email || '',
      p.level,
      `"${lastActivity}"`,
      p.daysInactive,
    ].join(';');
  });

  return [headers.join(';'), ...rows].join('\n');
};

/**
 * Export at-risk patients to CSV
 */
export const exportAtRiskPatientsToCSV = (
  patients: Array<{
    patient_name: string;
    email?: string;
    level: number;
    lastActivity: string;
    daysInactive: number;
}>
): void => {
  const csv = generateAtRiskPatientsCSV(patients);
  const filename = `pacientes_risco_gamificacao_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
};
