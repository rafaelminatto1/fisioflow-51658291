/**
 * Funções puras para lógica de agendamentos — sem dependências de React/browser.
 * Testáveis com vitest sem necessidade de jsdom.
 */

import { AppointmentBase } from "@/types/appointment";
import { fisioLogger as logger } from "@/lib/errors/logger";

export const EMERGENCY_CACHE_KEY = "fisioflow_appointments_emergency";
export const EMERGENCY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 dias

/** Wraps uma promise com um timeout. Rejeita após `timeoutMs` ms. */
export function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs),
    ),
  ]);
}

/** Retry com backoff exponencial. */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, initialDelay * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

/** Salva backup de emergência em localStorage (apenas campos essenciais). */
export function saveEmergencyBackup(
  appointments: AppointmentBase[],
  organizationId?: string,
): void {
  try {
    const minimal = appointments.map((apt) => ({
      id: apt.id,
      patientId: apt.patientId,
      patientName: apt.patientName,
      phone: apt.phone,
      date: apt.date instanceof Date ? apt.date.toISOString() : apt.date,
      time: apt.time,
      duration: apt.duration,
      type: apt.type,
      status: apt.status,
      notes: apt.notes,
      therapistId: apt.therapistId,
      room: apt.room,
    }));
    localStorage.setItem(
      EMERGENCY_CACHE_KEY,
      JSON.stringify({
        data: minimal,
        timestamp: new Date().toISOString(),
        organizationId,
        count: minimal.length,
      }),
    );
    logger.debug(
      `Backup de emergência salvo: ${minimal.length} agendamentos`,
      {},
      "appointmentHelpers",
    );
  } catch (err) {
    logger.warn("Falha ao salvar backup de emergência", err, "appointmentHelpers");
  }
}

export interface EmergencyBackupResult {
  data: AppointmentBase[];
  isFromCache: boolean;
  cacheTimestamp: string | null;
  source: "localstorage";
}

/** Lê backup de emergência do localStorage com validação de idade e organização. */
export function loadEmergencyBackup(organizationId?: string): EmergencyBackupResult {
  const empty: EmergencyBackupResult = {
    data: [],
    isFromCache: false,
    cacheTimestamp: null,
    source: "localstorage",
  };

  try {
    const raw = localStorage.getItem(EMERGENCY_CACHE_KEY);
    if (!raw) return empty;

    const backup = JSON.parse(raw);

    if (organizationId && backup.organizationId !== organizationId) return empty;

    const backupAge = Date.now() - new Date(backup.timestamp).getTime();
    if (backupAge > EMERGENCY_CACHE_MAX_AGE) {
      logger.warn(
        "Backup de emergência expirado",
        { ageHours: backupAge / 3600000 },
        "appointmentHelpers",
      );
      return empty;
    }

    const appointments: AppointmentBase[] = (backup.data || []).map(
      (apt: Record<string, unknown>) => ({
        ...apt,
        date: apt.date ? new Date(apt.date as string) : new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    logger.info(
      `Backup de emergência recuperado: ${appointments.length} agendamentos`,
      { ageMinutes: Math.round(backupAge / 60000) },
      "appointmentHelpers",
    );

    return {
      data: appointments,
      isFromCache: true,
      cacheTimestamp: backup.timestamp,
      source: "localstorage",
    };
  } catch (err) {
    logger.error("Falha ao ler backup de emergência", err, "appointmentHelpers");
    return empty;
  }
}

/** Detecta erros de rede/conexão para decidir sobre fallback de cache. */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const message = (error instanceof Error ? error.message : "").toLowerCase();
  return (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("fetch") ||
    message.includes("failed to fetch") ||
    message.includes("connection") ||
    message.includes("offline") ||
    message.includes("load failed") ||
    (error instanceof Error && error.name === "TypeError" && message === "failed to fetch") ||
    !navigator.onLine
  );
}
