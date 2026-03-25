/**
 * appointmentHelpers — funções puras extraídas de appointments.ts.
 * Todas testáveis sem dependências de Hono, DB ou Workers runtime.
 */

export const STATUS_MAP: Record<string, string> = {
  scheduled: 'agendado',
  confirmed: 'presenca_confirmada',
  in_progress: 'atendido',
  completed: 'atendido',
  cancelled: 'cancelado',
  no_show: 'faltou',
  rescheduled: 'remarcar',
  agendado: 'agendado',
  confirmado: 'presenca_confirmada',
  em_andamento: 'atendido',
  concluido: 'atendido',
  cancelado: 'cancelado',
  avaliacao: 'avaliacao',
  atendido: 'atendido',
  falta: 'faltou',
  faltou: 'faltou',
  remarcado: 'remarcar',
  reagendado: 'remarcar',
  aguardando_confirmacao: 'agendado',
};

const VALID_STATUSES = new Set([
  'agendado',
  'atendido',
  'avaliacao',
  'cancelado',
  'faltou',
  'faltou_com_aviso',
  'faltou_sem_aviso',
  'nao_atendido',
  'nao_atendido_sem_cobranca',
  'presenca_confirmada',
  'remarcar',
]);

export function normalizeStatus(raw: string | undefined): any {
  if (!raw) return 'agendado';
  const normalized = raw.toLowerCase().trim();
  if (VALID_STATUSES.has(normalized)) return normalized;
  return STATUS_MAP[normalized] ?? 'agendado';
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const endHours = Math.floor(normalizedMinutes / 60);
  const endMinutes = normalizedMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

export function sanitizeAppointmentRow(row: Record<string, unknown>): Record<string, unknown> {
  const startTime =
    row.start_time && row.start_time !== '' && row.start_time !== 'null'
      ? (row.start_time as string).substring(0, 5)
      : '08:00';

  const duration = parseInt(String(row.duration_minutes ?? '60'), 10) || 60;

  const endTime =
    row.end_time && row.end_time !== '' && row.end_time !== 'null'
      ? (row.end_time as string).substring(0, 5)
      : calculateEndTime(startTime, duration);

  return { ...row, start_time: startTime, end_time: endTime, duration_minutes: duration };
}

export function isConflictError(err: { code?: string; message?: string }): boolean {
  return (
    err.code === '23P01' || // exclusion_violation
    err.code === '23505' || // unique_violation
    (!!err.message &&
      (err.message.includes('no_overlapping_therapist_appointments') ||
        err.message.includes('duplicate key value violates unique constraint')))
  );
}

export function countsTowardCapacity(status: string): boolean {
  return !['cancelado', 'faltou', 'remarcar'].includes(status);
}
