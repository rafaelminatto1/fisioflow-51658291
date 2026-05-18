/**
 * useEvolutionDraft — persiste o rascunho da evolução em localStorage.
 *
 * Resolve dois cenários:
 *  1. Usuário fecha/recarrega a aba antes do auto-save subir → ao reabrir,
 *     o draft é hidratado.
 *  2. Auto-save falhou e ficou na fila offline → o draft persiste até que
 *     o servidor confirme.
 *
 * O draft é removido só após o `record.id` retornar do servidor (sinal de
 * que a sessão foi persistida no Neon).
 */
import { useCallback, useEffect, useRef } from "react";
import { fisioLogger as logger } from "@/lib/errors/logger";

const PREFIX = "fisioflow:evolution-draft:";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 dias

function buildKey(parts: {
  evolutionId?: string | null;
  patientId?: string | null;
  appointmentId?: string | null;
  sessionDate?: string | null;
}): string | null {
  // Preferimos o evolutionId quando existe (único, estável).
  if (parts.evolutionId) return `${PREFIX}id:${parts.evolutionId}`;
  // Senão, identificamos por paciente + appointment ou data.
  if (parts.patientId && parts.appointmentId)
    return `${PREFIX}appt:${parts.patientId}:${parts.appointmentId}`;
  if (parts.patientId && parts.sessionDate)
    return `${PREFIX}date:${parts.patientId}:${parts.sessionDate}`;
  return null;
}

interface DraftEnvelope<T> {
  data: T;
  savedAt: number;
  version: 1;
}

export interface UseEvolutionDraftOptions<_T> {
  evolutionId?: string | null;
  patientId?: string | null;
  appointmentId?: string | null;
  sessionDate?: string | null;
  /** Habilita persistência. Quando false, hook vira no-op. */
  enabled?: boolean;
}

export function useEvolutionDraft<T>({
  evolutionId,
  patientId,
  appointmentId,
  sessionDate,
  enabled = true,
}: UseEvolutionDraftOptions<T>) {
  const keyRef = useRef<string | null>(null);
  keyRef.current = enabled
    ? buildKey({ evolutionId, patientId, appointmentId, sessionDate })
    : null;

  /** Lê o rascunho local. Retorna null se não houver / inválido / expirado. */
  const readDraft = useCallback((): T | null => {
    const key = keyRef.current;
    if (!key || typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const env = JSON.parse(raw) as DraftEnvelope<T>;
      if (!env || env.version !== 1) return null;
      if (Date.now() - env.savedAt > MAX_AGE_MS) {
        window.localStorage.removeItem(key);
        return null;
      }
      return env.data;
    } catch (err) {
      logger.warn("Falha ao ler draft local", err as Error, "useEvolutionDraft");
      return null;
    }
  }, []);

  /** Persiste o rascunho. Chamar a cada onChange do painel. */
  const writeDraft = useCallback((data: T) => {
    const key = keyRef.current;
    if (!key || typeof window === "undefined") return;
    try {
      const env: DraftEnvelope<T> = { data, savedAt: Date.now(), version: 1 };
      window.localStorage.setItem(key, JSON.stringify(env));
    } catch (err) {
      // Quota cheia, modo privado, etc — não bloquear o uso
      logger.warn("Falha ao gravar draft local", err as Error, "useEvolutionDraft");
    }
  }, []);

  /** Remove o rascunho — chamar após confirmação do servidor. */
  const clearDraft = useCallback(() => {
    const key = keyRef.current;
    if (!key || typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, []);

  // Limpeza oportunista de drafts antigos (>14 dias) no mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const now = Date.now();
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        if (!k || !k.startsWith(PREFIX)) continue;
        try {
          const raw = window.localStorage.getItem(k);
          if (!raw) continue;
          const env = JSON.parse(raw) as DraftEnvelope<unknown>;
          if (!env?.savedAt || now - env.savedAt > MAX_AGE_MS) {
            window.localStorage.removeItem(k);
          }
        } catch {
          window.localStorage.removeItem(k);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  return { readDraft, writeDraft, clearDraft };
}
