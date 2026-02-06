/**
 * Mensagens e helpers para erros de agendamento (conflito de horário, etc.)
 * Centraliza texto e detecção para manter consistência na UI.
 *
 * Backend retorna 409 com body: { "error": "Conflito de horário detectado" }.
 * O cliente HTTP lança Error com message tipo "HTTP 409: {...}".
 */

/** Mensagem amigável exibida quando o backend retorna 409 (conflito de horário). */
export const APPOINTMENT_CONFLICT_MESSAGE =
  'Capacidade máxima de pacientes por horário atingida. Escolha outro horário ou entre na fila de espera.';

/** Título opcional para toasts de conflito. */
export const APPOINTMENT_CONFLICT_TITLE = 'Conflito de horário';

/**
 * Indica se o erro é de conflito de horário (HTTP 409 ou mensagem do backend).
 * Usado para exibir mensagem amigável e evitar toast genérico.
 *
 * @example
 * if (isAppointmentConflictError(error)) {
 *   toast.error(APPOINTMENT_CONFLICT_MESSAGE);
 * } else {
 *   ErrorHandler.handle(error, 'context');
 * }
 */
export function isAppointmentConflictError(error: unknown): boolean {
  if (error == null) return false;
  const msg =
    typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string'
      ? (error as { message: string }).message
      : error instanceof Error
        ? error.message
        : String(error);
  return msg.includes('409') || msg.includes('Conflito de horário');
}

/**
 * Retorna a mensagem amigável de conflito se o erro for de conflito de horário, ou null.
 * Útil para unificar: toast.error(getAppointmentConflictUserMessage(error) ?? fallbackMessage).
 */
export function getAppointmentConflictUserMessage(error: unknown): string | null {
  return isAppointmentConflictError(error) ? APPOINTMENT_CONFLICT_MESSAGE : null;
}
