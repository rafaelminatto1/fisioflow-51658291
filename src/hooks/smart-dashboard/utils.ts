import { todayYMD } from "@/lib/date-utils";
import { ContaFinanceira } from "@/types/workers";

export const DEFAULT_MEDICAL_RETURN_DAYS = 14;

export const isCompletedStatus = (status: unknown) =>
  ["atendido", "completed", "concluido", "realizado"].includes(String(status ?? "").toLowerCase());

export const isCancelledStatus = (status: unknown) =>
  ["cancelado", "cancelled", "remarcar"].includes(String(status ?? "").toLowerCase());

export const isNoShowStatus = (status: unknown) =>
  [
    "faltou",
    "faltou_com_aviso",
    "faltou_sem_aviso",
    "nao_atendido",
    "nao_atendido_sem_cobranca",
    "no_show",
    "falta",
  ].includes(String(status ?? "").toLowerCase());

export const toDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(value as string);
  return isNaN(date.getTime()) ? null : date;
};

export const sumRevenue = (rows: ContaFinanceira[]) =>
  rows.reduce((acc, row) => acc + Number(row.valor ?? 0), 0);

export const isBirthdayToday = (birthDate: string | null | undefined): boolean => {
  if (!birthDate) return false;
  const todayStr = todayYMD().slice(5, 10);
  return birthDate.slice(5, 10) === todayStr;
};
