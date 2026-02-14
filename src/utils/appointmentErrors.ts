import { FunctionCallError } from '@/integrations/firebase/functions';

/** Mensagens e helpers para erros de agendamento (conflito de horário, etc.)
 * Centraliza texto e detecção para manter consistência na UI.
 *
 * Backend retorna 409 com body: { "error": "Conflito de horário detectado" }.
 * O cliente HTTP lança Error com message tipo "HTTP 409: {...}".
 */

/** Mensagem amigável exibida quando o backend retorna 409 (conflito de horário). */
export const APPOINTMENT_CONFLICT_MESSAGE =
  '⚠️ Já existe um agendamento neste horário. Escolha outro horário ou verifique se não está duplicando um agendamento existente.';

/** Título opcional para toasts de conflito. */
export const APPOINTMENT_CONFLICT_TITLE = 'Conflito de horário';

export function isAppointmentConflictError(error: unknown): boolean {
  if (error == null) return false;
  const msg =
    typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string'
      ? (error as { message: string }).message
      : error instanceof Error
        ? error.message
        : String(error);
  return msg.includes('409') ||
         msg.includes('Conflito de horário') ||
         msg.includes('duplicate key value violates unique constraint') ||
         msg.includes('idx_appointments_time_conflict') ||
         msg.includes('time_conflict');
}

interface AppointmentConflictDetails {
  capacity?: number;
  total?: number;
  conflicts?: {
    id?: string;
    patient_name?: string;
    patient_id?: string;
    therapist_name?: string;
    therapist_id?: string;
    start_time?: string;
    date?: string;
  }[];
}

function formatConflictMessage(details: AppointmentConflictDetails): string {
  const conflict = details.conflicts?.[0];
  if (!conflict) return APPOINTMENT_CONFLICT_MESSAGE;
  const patient = conflict.patient_name || conflict.patient_id || 'este paciente';
  const therapist = conflict.therapist_name || conflict.therapist_id || 'este terapeuta';
  const time = conflict.start_time ? conflict.start_time.slice(0, 5) : 'o horário informado';
  const date = conflict.date ? new Date(conflict.date).toLocaleDateString('pt-BR') : 'essa data';
  const slotInfo =
    typeof details.total === 'number' && typeof details.capacity === 'number'
      ? ` (${details.total}/${details.capacity} vagas)`
      : '';
  return `⚠️ Já existe o agendamento${conflict.id ? ` ${conflict.id}` : ''} do paciente ${patient} para o terapeuta ${therapist} às ${time} de ${date}${slotInfo}.`;
}

function extractConflictDetails(error: unknown): AppointmentConflictDetails | null {
  if (error instanceof FunctionCallError && error.payload && typeof error.payload === 'object') {
    const payload = error.payload as AppointmentConflictDetails;
    if (payload.conflicts || payload.capacity || payload.total) {
      return payload;
    }
  }
  if (typeof error === 'object' && error !== null && 'conflicts' in error) {
    const payload = error as AppointmentConflictDetails;
    return payload;
  }
  return null;
}

export function getAppointmentConflictUserMessage(error: unknown): string | null {
  const details = extractConflictDetails(error);
  if (details) return formatConflictMessage(details);
  return isAppointmentConflictError(error) ? APPOINTMENT_CONFLICT_MESSAGE : null;
}
