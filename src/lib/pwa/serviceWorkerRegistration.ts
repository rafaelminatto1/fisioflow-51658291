import { fisioLogger as logger } from "@/lib/errors/logger";

export const SERVICE_WORKER_URL = "/service-worker.js";
export const SERVICE_WORKER_UPDATE_INTERVAL_MS = 60 * 60 * 1000;

type PeriodicSyncRegistration = ServiceWorkerRegistration & {
  periodicSync?: {
    getTags?: () => Promise<string[]>;
    register: (tag: string, options?: { minInterval?: number }) => Promise<void>;
  };
};

const PERIODIC_WIKI_SYNC_TAG = "wiki-sync";
const PERIODIC_WIKI_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function getPeriodicBackgroundSyncPermission(): Promise<PermissionState | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unsupported";
  }

  try {
    const status = await navigator.permissions.query({
      name: "periodic-background-sync" as PermissionName,
    });
    return status.state;
  } catch {
    return "unsupported";
  }
}

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
    const permissionState = await getPeriodicBackgroundSyncPermission();
    if (permissionState !== "unsupported" && permissionState !== "granted") {
      logger.debug(
        "[PWA] Periodic Sync indisponível para este contexto",
        { tag: PERIODIC_WIKI_SYNC_TAG, permissionState },
        "serviceWorker",
      );
      return;
    }

    const tags = await periodicRegistration.periodicSync.getTags?.();
    if (tags?.includes(PERIODIC_WIKI_SYNC_TAG)) return;

    await periodicRegistration.periodicSync.register(PERIODIC_WIKI_SYNC_TAG, {
      minInterval: PERIODIC_WIKI_SYNC_INTERVAL_MS,
    });
    logger.info("[PWA] Periodic Sync registrado", { tag: PERIODIC_WIKI_SYNC_TAG }, "serviceWorker");
  } catch (err: unknown) {
    const errorName = (err as { name?: string })?.name ?? "UnknownError";
    logger.debug(
      "[PWA] Periodic Sync não disponível; usando atualização em foreground",
      { tag: PERIODIC_WIKI_SYNC_TAG, errorName },
      "serviceWorker",
    );
  }
}

export function scheduleServiceWorkerUpdateChecks(
  registration: ServiceWorkerRegistration,
  intervalMs = SERVICE_WORKER_UPDATE_INTERVAL_MS,
): ReturnType<typeof setInterval> {
  return setInterval(() => {
    logger.debug("[PWA] Verificando atualizações em segundo plano", undefined, "serviceWorker");
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

    logger.info("[PWA] Service Worker registrado", { scope: registration.scope }, "serviceWorker");
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
