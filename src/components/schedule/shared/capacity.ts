/**
 * Shared capacity and overbooking helpers for schedule components.
 */

export const OVERBOOK_MARKER = "[EXCEDENTE]";

export const NON_CAPACITY_STATUSES = new Set([
  "cancelado",
  "faltou",
  "faltou_com_aviso",
  "faltou_sem_aviso",
  "nao_atendido",
  "nao_atendido_sem_cobranca",
  "remarcar",
]);

export function isCapacityCountedStatus(status: string | undefined | null): boolean {
  return !NON_CAPACITY_STATUSES.has((status || "").toLowerCase());
}

export function isMarkedOverbooked(
  notes: string | undefined | null,
  isOverbooked?: boolean | null,
): boolean {
  return Boolean(isOverbooked || notes?.includes(OVERBOOK_MARKER));
}
