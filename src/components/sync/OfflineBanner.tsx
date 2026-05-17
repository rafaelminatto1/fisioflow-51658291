import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { useOfflineSync } from "@/services/offlineSync";
import { ConflictResolutionModal } from "./ConflictResolutionModal";
import { cn } from "@/lib/utils";

/**
 * Banner global de status offline.
 *
 * Mostra:
 *  - "Sem conexão" quando navigator.onLine = false (com contador de pendentes)
 *  - "X alterações pendentes" quando online mas com fila não-drenada
 *  - "Sincronizado!" por 3s após o drain terminar
 *  - Nada quando online + fila vazia
 *
 * Fonte da verdade: serviço offlineSync (mesmo usado pelo request() em
 * src/api/v2/base.ts para enfileirar mutations que falham por rede).
 */
export function OfflineBanner() {
  const { isOnline, stats, syncNow } = useOfflineSync();
  const pending = stats.pendingActions;
  const conflicts = stats.conflictedActions;
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [prevPending, setPrevPending] = useState(pending);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);

  // Detecta transição "tinha pendente → zerou" para mostrar "Sincronizado!"
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

  if (isOnline && pending === 0 && conflicts === 0 && !justSynced) return null;

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
    {(!isOnline || pending > 0 || justSynced) && (
    <div
      role="status"
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg",
        !isOnline
          ? "bg-amber-500 text-white"
          : justSynced
            ? "bg-emerald-600 text-white"
            : "bg-blue-600 text-white",
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>
            Sem conexão
            {pending > 0
              ? ` — ${pending} alteração${pending > 1 ? "ões" : ""} pendente${pending > 1 ? "s" : ""}`
              : ""}
          </span>
        </>
      ) : justSynced ? (
        <>
          <CheckCircle className="h-4 w-4" />
          <span>Sincronizado!</span>
        </>
      ) : pending > 0 ? (
        <>
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          <span>
            {pending} alteração{pending > 1 ? "ões" : ""} pendente{pending > 1 ? "s" : ""}
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
      ) : null}
    </div>
    )}
    </>
  );
}
