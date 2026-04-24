/**
 * appointmentHelpers — funções puras extraídas de appointments.ts.
 * Todas testáveis sem dependências de Hono, DB ou Workers runtime.
 */

export const STATUS_MAP: Record<string, string> = {
  // Canonical PT-BR enum values stored in the database (pass-through)
  agendado: 'agendado',
  atendido: 'atendido',
  avaliacao: 'avaliacao',
  cancelado: 'cancelado',
  faltou: 'faltou',
  faltou_com_aviso: 'faltou_com_aviso',
  faltou_sem_aviso: 'faltou_sem_aviso',
  nao_atendido: 'nao_atendido',
  nao_atendido_sem_cobranca: 'nao_atendido_sem_cobranca',
  presenca_confirmada: 'presenca_confirmada',
  remarcar: 'remarcar',

  // Legacy English aliases -> canonical PT-BR enum values
  scheduled: 'agendado',
  confirmed: 'presenca_confirmada',
  in_progress: 'atendido',
  completed: 'atendido',
  evaluation: 'avaliacao',
  cancelled: 'cancelado',
  no_show: 'faltou',
  rescheduled: 'remarcar',

  // Other accepted aliases -> canonical PT-BR enum values
  aguardando: 'agendado',
  aguardando_confirmacao: 'agendado',
  confirmado: 'presenca_confirmada',
  em_andamento: 'atendido',
  concluido: 'atendido',
  falta: 'faltou',
  remarcado: 'remarcar',
  reagendado: 'remarcar',
};

export const APPOINTMENT_TYPE_MAP: Record<string, string> = {
  'avaliação inicial': 'evaluation',
  'avaliacao inicial': 'evaluation',
  avaliacao: 'evaluation',
  evaluation: 'evaluation',
  fisioterapia: 'session',
  session: 'session',
  sessão: 'session',
  sessao: 'session',
  osteopatia: 'session',
  reabilitação: 'session',
  reabilitacao: 'session',
  drenagem: 'session',
  drenagem_linfatica: 'session',
  massagem: 'session',
  rpg: 'session',
  pilates: 'session',
  reavaliação: 'reassessment',
  reavaliacao: 'reassessment',
  reassessment: 'reassessment',
  grupo: 'group',
  group: 'group',
  retorno: 'return',
  return: 'return',
  outro: 'session',
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

export function normalizeStatus(raw: string | undefined): string {
  if (!raw) return 'agendado';
  const normalized = raw.toLowerCase().trim().replace(/\s+/g, '_');
  if (VALID_STATUSES.has(normalized)) return normalized;
  return STATUS_MAP[normalized] ?? 'agendado';
}

export function normalizeAppointmentType(raw: string | undefined): string {
  if (!raw) return 'session';
  const normalized = raw.toLowerCase().trim();
  return APPOINTMENT_TYPE_MAP[normalized] ?? 'session';
}

export function presentAppointmentType(raw: string | undefined): string {
  switch (normalizeAppointmentType(raw)) {
    case 'evaluation':
      return 'Avaliação Inicial';
    case 'reassessment':
      return 'Reavaliação';
    case 'group':
      return 'Grupo';
    case 'return':
      return 'Retorno';
    case 'session':
    default:
      return 'Fisioterapia';
  }
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
  const normalized = normalizeStatus(status);
  return ![
    'cancelado',
    'faltou',
    'faltou_com_aviso',
    'faltou_sem_aviso',
    'nao_atendido',
    'nao_atendido_sem_cobranca',
    'remarcar',
  ].includes(normalized);
}

