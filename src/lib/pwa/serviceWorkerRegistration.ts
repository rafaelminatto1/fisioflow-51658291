import { fisioLogger as logger } from "@/lib/errors/logger";

export const SERVICE_WORKER_URL = "/service-worker.js";
export const SERVICE_WORKER_UPDATE_INTERVAL_MS = 60 * 60 * 1000;

type PeriodicSyncRegistration = ServiceWorkerRegistration & {
  periodicSync?: {
    register: (tag: string, options?: { minInterval?: number }) => Promise<void>;
  };
};

export function canRegisterAppServiceWorker(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && import.meta.env.PROD;
}

export async function getCurrentServiceWorkerRegistration(): Promise<
  ServiceWorkerRegistration | undefined
> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return undefined;

  return (
    (await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL)) ||
    (await navigator.serviceWorker.getRegistration())
  );
}

export async function registerPeriodicWikiSync(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  const periodicRegistration = registration as PeriodicSyncRegistration;
  if (!periodicRegistration.periodicSync) return;

  try {
    await periodicRegistration.periodicSync.register("wiki-sync", {
      minInterval: 24 * 60 * 60 * 1000,
    });
    console.log("[PWA] Periodic Sync registrado: wiki-sync");
  } catch (err: unknown) {
    if ((err as { name?: string })?.name !== "NotAllowedError") {
      console.warn("[PWA] Periodic Sync não pôde ser registrado:", err);
    }
  }
}

export function scheduleServiceWorkerUpdateChecks(
  registration: ServiceWorkerRegistration,
  intervalMs = SERVICE_WORKER_UPDATE_INTERVAL_MS,
): ReturnType<typeof setInterval> {
  return setInterval(() => {
    console.log("[PWA] Verificando atualizações em segundo plano...");
    void registration.update().catch((error) => {
      logger.debug("[PWA] Verificação de Service Worker sem atualização", error, "serviceWorker");
    });
  }, intervalMs);
}

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!canRegisterAppServiceWorker()) return null;

  try {
    const registration =
      (await getCurrentServiceWorkerRegistration()) ||
      (await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" }));

    console.log("[PWA] Service Worker registrado:", registration.scope);
    scheduleServiceWorkerUpdateChecks(registration);

    void navigator.serviceWorker.ready.then(registerPeriodicWikiSync).catch((error) => {
      logger.warn(
        "[PWA] Service Worker pronto, mas Periodic Sync não pôde iniciar",
        error,
        "serviceWorker",
      );
    });

    return registration;
  } catch (error) {
    logger.error("[PWA] Erro no registro do Service Worker", error, "serviceWorker");
    return null;
  }
}
