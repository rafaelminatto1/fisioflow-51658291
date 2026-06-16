import { safeLocalStorageGet, safeLocalStorageSet } from "@/utils/safeStorage";

const STORAGE_KEY = "fisioflow:evolution-device-id";

function generateDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateEvolutionDeviceId(): string {
  if (typeof window === "undefined") {
    return "server-render";
  }

  const existing = safeLocalStorageGet<string | null>(STORAGE_KEY, null);
  if (typeof existing === "string" && existing.trim().length > 0) {
    return existing;
  }

  const nextId = generateDeviceId();
  safeLocalStorageSet(STORAGE_KEY, nextId);
  return nextId;
}
