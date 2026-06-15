/**
 * Banner global de status offline.
 *
 * Mostra (em ordem de prioridade):
 *  - "X conflitos de sincronização — Resolver" (vermelho, top)
 *  - "Sem conexão — N pendentes" (amber) quando offline
 *  - "Sincronizando..." / "N pendentes — Sincronizar agora" (azul) quando online com fila
 *  - "Sincronizado!" (verde) por 3s após drain
 *
 * Fonte da verdade: `useOfflineSync()` — mesmo serviço que o `request()` em
 * src/api/v2/base.ts usa para enfileirar mutations.
 */
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, RefreshCw, WifiOff } from "lucide-react";
import { useOfflineSync } from "@/services/offlineSync";
import { ConflictResolutionModal } from "./ConflictResolutionModal";
import { cn } from "@/lib/utils";

type BannerState =
  | { kind: "offline"; pending: number }
  | { kind: "synced" }
  | { kind: "pending"; count: number }
  | null;

function pickBannerState(isOnline: boolean, pending: number, justSynced: boolean): BannerState {
  if (!isOnline) return { kind: "offline", pending };
  if (justSynced) return { kind: "synced" };
  if (pending > 0) return { kind: "pending", count: pending };
  return null;
}

export function OfflineBanner() {
  const { isOnline, stats, syncNow } = useOfflineSync();
  const pending = stats.pendingActions;
  const conflicts = stats.conflictedActions;

  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [prevPending, setPrevPending] = useState(pending);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);

  // Transição "tinha pendente → zerou + online" → "Sincronizado!" por 3s
  useEffect(() => {
    if (prevPending > 0 && pending === 0 && isOnline) {
      setJustSynced(true);
      const id = setTimeout(() => setJustSynced(false), 3000);
      return () => clearTimeout(id);
    }
    setPrevPending(pending);
  }, [pending, prevPending, isOnline]);

  const handleManualSync = async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    try {
      await syncNow();
    } finally {
      setSyncing(false);
    }
  };

  const banner = pickBannerState(isOnline, pending, justSynced);

  return (
    <>
      <ConflictResolutionModal open={conflictModalOpen} onOpenChange={setConflictModalOpen} />

      {conflicts > 0 && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>
            {conflicts} conflito{conflicts > 1 ? "s" : ""} de sincronização
          </span>
          <button
            type="button"
            onClick={() => setConflictModalOpen(true)}
            className="ml-1 underline opacity-90 hover:opacity-100"
          >
            Resolver
          </button>
        </div>
      )}

      {banner && (
        <div
          role="status"
          className={cn(
            "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg",
            banner.kind === "offline" && "bg-amber-500 text-white",
            banner.kind === "synced" && "bg-emerald-600 text-white",
            banner.kind === "pending" && "bg-blue-600 text-white",
          )}
        >
          {banner.kind === "offline" && (
            <>
              <WifiOff className="h-4 w-4" />
              <span>
                Sem conexão
                {banner.pending > 0 &&
                  ` — ${banner.pending} alteração${banner.pending > 1 ? "ões" : ""} pendente${banner.pending > 1 ? "s" : ""}`}
              </span>
            </>
          )}

          {banner.kind === "synced" && (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Sincronizado!</span>
            </>
          )}

          {banner.kind === "pending" && (
            <>
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              <span>
                {banner.count} alteração{banner.count > 1 ? "ões" : ""} pendente
                {banner.count > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={handleManualSync}
                className="ml-1 underline opacity-90 hover:opacity-100 disabled:opacity-60"
                disabled={syncing}
              >
                {syncing ? "Sincronizando..." : "Sincronizar agora"}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
