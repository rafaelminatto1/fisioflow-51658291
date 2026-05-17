/**
 * usePendingSyncIds — retorna o conjunto de IDs de entidades com mutations
 * pendentes na fila offline (`offline_actions` em IndexedDB).
 *
 * Usado para mostrar badges "Pendente de sincronizar" em cards de agendamento,
 * pacientes etc. enquanto a fila não foi drenada.
 */
import { useEffect, useState } from "react";
import { getDB } from "@/hooks/useOfflineStorage";
import { useOfflineSync } from "@/services/offlineSync";

/**
 * Extrai um ID de recurso do payload de uma ação enfileirada.
 * Ex.: payload.url = "/api/appointments/abc-123" → "abc-123"
 *      payload.url = "/api/appointments" + body com {id} → body.id
 */
function extractIdFromAction(action: {
  action: string;
  payload: unknown;
}, resource: string): string | null {
  const p = action.payload as
    | { url?: string; method?: string; body?: string | Record<string, unknown>; id?: string }
    | undefined;
  if (!p) return null;

  // API_REQUEST: payload tem url no formato "/api/<resource>/<id>"
  if (typeof p.url === "string") {
    const match = p.url.match(new RegExp(`/api/${resource}/([^/?#]+)`));
    if (match?.[1] && match[1] !== "autosave") return match[1];
  }

  // Ações específicas que carregam {id} no payload direto
  if (typeof p.id === "string") return p.id;
  if (p.body && typeof p.body === "object" && "id" in p.body && typeof (p.body as { id?: unknown }).id === "string") {
    return (p.body as { id: string }).id;
  }

  return null;
}

export function usePendingSyncIds(resource: "appointments" | "patients" | "sessions" = "appointments") {
  const [ids, setIds] = useState<Set<string>>(new Set());
  // Re-busca quando a fila muda
  const { stats } = useOfflineSync();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await getDB();
        const all = await db.getAll("offline_actions");
        if (cancelled) return;
        const next = new Set<string>();
        for (const action of all) {
          if (action.synced) continue;
          const id = extractIdFromAction(action, resource);
          if (id) next.add(id);
        }
        setIds(next);
      } catch {
        if (!cancelled) setIds(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resource, stats.pendingActions, stats.syncedActions]);

  return ids;
}
