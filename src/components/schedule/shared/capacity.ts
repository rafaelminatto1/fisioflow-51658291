/**
 * Shared capacity and overbooking helpers for schedule components.
 */

export const OVERBOOK_MARKER = '[EXCEDENTE]';

export const NON_CAPACITY_STATUSES = new Set([
  'cancelado',
  'falta',
  'faltou',
  'remarcado',
  'reagendado',
  'paciente_faltou',
]);

export function isCapacityCountedStatus(status: string | undefined | null): boolean {
  return !NON_CAPACITY_STATUSES.has((status || '').toLowerCase());
}

export function isMarkedOverbooked(
  notes: string | undefined | null,
  isOverbooked?: boolean | null
): boolean {
  return Boolean(isOverbooked || notes?.includes(OVERBOOK_MARKER));
}
