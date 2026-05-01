import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle } from "lucide-react";
import { pendingCount, drainNow } from "@/lib/offline-queue";
import { getNeonAccessToken } from "@/lib/auth/neon-token";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  // Poll pending count
  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      if (!mounted) return;
      setPending(await pendingCount());
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // Online/offline events
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Listen for SW sync complete messages
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_COMPLETE") {
        pendingCount().then(setPending);
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 3000);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, []);

  const handleManualSync = async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    try {
      await drainNow(() => getNeonAccessToken());
      setPending(await pendingCount());
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pending === 0 && !justSynced) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-all",
        !isOnline
          ? "bg-amber-500 text-white"
          : justSynced
            ? "bg-green-600 text-white"
            : "bg-blue-600 text-white",
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Sem conexão{pending > 0 ? ` — ${pending} alteração${pending > 1 ? "ões" : ""} pendente${pending > 1 ? "s" : ""}` : ""}</span>
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
            onClick={handleManualSync}
            className="ml-1 underline opacity-90 hover:opacity-100"
            disabled={syncing}
          >
            {syncing ? "Sincronizando..." : "Sincronizar agora"}
          </button>
        </>
      ) : null}
    </div>
  );
}
