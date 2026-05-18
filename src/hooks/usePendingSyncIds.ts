/**
 * usePendingSyncIds — retorna o conjunto de IDs de entidades com mutations
 * pendentes na fila offline (`offline_actions` em IndexedDB).
 *
 * Usado para mostrar badges "Pendente de sincronizar" em cards de agendamento,
 * pacientes etc. enquanto a fila não foi drenada.
 *
 * Implementação: store singleton com cache compartilhado entre todos os
 * componentes que usam o hook. Faz uma única leitura IDB por mudança de
 * stats, em vez de N (uma por card).
 */
import { useEffect, useSyncExternalStore } from "react";
import { getDB } from "@/hooks/useOfflineStorage";
import { useOfflineSync } from "@/services/offlineSync";

type Resource = "appointments" | "patients" | "sessions";
type PendingMap = Record<Resource, Set<string>>;

const EMPTY: PendingMap = {
  appointments: new Set(),
  patients: new Set(),
  sessions: new Set(),
};

// ── Singleton store ────────────────────────────────────────────────────────
let snapshot: PendingMap = EMPTY;
const subscribers = new Set<() => void>();
let refreshInFlight: Promise<void> | null = null;

function subscribe(cb: () => void) {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function getResourceSnapshot(resource: Resource): Set<string> {
  return snapshot[resource];
}

function extractId(url: string, resource: Resource): string | null {
  const match = url.match(new RegExp(`/api/${resource}/([^/?#]+)`));
  return match?.[1] && match[1] !== "autosave" ? match[1] : null;
}

async function refreshSnapshot(): Promise<void> {
  // Dedupe — se já está rodando, retorna a mesma promise
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const db = await getDB();
      const all = await db.getAll("offline_actions");
      const next: PendingMap = {
        appointments: new Set(),
        patients: new Set(),
        sessions: new Set(),
      };
      for (const action of all) {
        if (action.synced) continue;
        const payload = action.payload as { url?: string; id?: string } | undefined;
        if (!payload) continue;
        const url = typeof payload.url === "string" ? payload.url : "";
        for (const r of Object.keys(next) as Resource[]) {
          const id = url ? extractId(url, r) : null;
          if (id) next[r].add(id);
        }
        // Fallback: payload.id (ações como UPDATE_PATIENT carregam {id} direto)
        if (typeof payload.id === "string") {
          if (action.action.includes("APPOINTMENT")) next.appointments.add(payload.id);
          if (action.action.includes("PATIENT")) next.patients.add(payload.id);
        }
      }
      snapshot = next;
    } catch {
      snapshot = EMPTY;
    } finally {
      refreshInFlight = null;
      subscribers.forEach((cb) => cb());
    }
  })();
  return refreshInFlight;
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function usePendingSyncIds(resource: Resource = "appointments"): Set<string> {
  const { stats } = useOfflineSync();

  // Re-busca o snapshot quando a fila muda. Como `refreshSnapshot` é deduped,
  // múltiplos componentes assinando geram apenas 1 leitura IDB por mudança.
  useEffect(() => {
    void refreshSnapshot();
  }, [stats.pendingActions, stats.syncedActions, stats.conflictedActions]);

  return useSyncExternalStore(
    subscribe,
    () => getResourceSnapshot(resource),
    () => EMPTY[resource],
  );
}
