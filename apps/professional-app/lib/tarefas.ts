import type { TarefaStatus } from './api';

const VALID_STATUSES: TarefaStatus[] = [
  'BACKLOG', 'A_FAZER', 'EM_PROGRESSO', 'REVISAO', 'CONCLUIDO', 'ARQUIVADO',
];

export function isTarefaStatus(val: unknown): val is TarefaStatus {
  return typeof val === 'string' && VALID_STATUSES.includes(val as TarefaStatus);
}

/** "17/03" */
export function formatDateShort(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00'); // força meia-noite local
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** "17/03/2026" */
export function formatDateFull(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** true se a data (sem hora) é anterior ao dia de hoje */
export function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  return due < today;
}

/** Gera ID único para items de checklist criados localmente */
export function genLocalId(): string {
  return crypto.randomUUID();
}
