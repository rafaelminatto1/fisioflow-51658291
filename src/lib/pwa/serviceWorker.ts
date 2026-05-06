import { fisioLogger as logger } from "@/lib/errors/logger";

export function canUseServiceWorker(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    import.meta.env.PROD &&
    !navigator.webdriver
  );
}

export async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!canUseServiceWorker()) return null;

  const existingRegistration =
    (await navigator.serviceWorker.getRegistration("/service-worker.js")) ||
    (await navigator.serviceWorker.getRegistration());

  if (existingRegistration) {
    return existingRegistration;
  }

  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js", {
      scope: "/",
    });
    logger.info(
      "Service Worker registrado com sucesso",
      { scope: registration.scope },
      "serviceWorker",
    );
    return registration;
  } catch (error) {
    logger.error("Falha ao registrar Service Worker", error, "serviceWorker");
    return null;
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  return Notification.requestPermission();
}
