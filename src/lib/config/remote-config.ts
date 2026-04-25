/**
 * Remote config local.
 *
 * Fonte de verdade:
 * - overrides em localStorage (`remote-config:<key>`)
 * - variáveis de ambiente VITE_*
 * - defaults locais
 */

import { logger } from "@/lib/errors/logger";

const DEFAULTS: Record<string, string | number | boolean> = {
  ai_features_enabled: true,
  semantic_search_enabled: false,
  rag_enabled: false,
  telemedicine_enabled: true,
  gamification_enabled: true,
  maintenance_mode: false,
  max_daily_appointments: 50,
  brand_primary_color: "#3b82f6",
  debug_logging_enabled: import.meta.env.DEV,
  onboarding_variant: "v1",
  ai_show_suggestions: true,
};

function getOverride(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`remote-config:${key}`);
}

function readRawValue(key: string): string | number | boolean | undefined {
  const override = getOverride(key);
  if (override != null) return override;

  const envKey = `VITE_${key.toUpperCase()}`;
  const envValue = import.meta.env[envKey];
  if (envValue != null) return envValue;

  return DEFAULTS[key];
}

function coerceBoolean(value: string | number | boolean | undefined, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "true" || value === "1";
  return fallback;
}

function coerceNumber(value: string | number | boolean | undefined, fallback: number): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return fallback;
}

function coerceString(value: string | number | boolean | undefined, fallback: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

export async function initRemoteConfig() {
  logger.info("[RemoteConfig] Inicializado via env/localStorage");
  return true;
}

export async function getRemoteBoolean(key: string, defaultValue = false): Promise<boolean> {
  return coerceBoolean(readRawValue(key), defaultValue);
}

export async function getRemoteNumber(key: string, defaultValue = 0): Promise<number> {
  return coerceNumber(readRawValue(key), defaultValue);
}

export async function getRemoteString(key: string, defaultValue = ""): Promise<string> {
  return coerceString(readRawValue(key), defaultValue);
}

export async function getAllRemoteConfig(): Promise<Record<string, string | number | boolean>> {
  return { ...DEFAULTS };
}

export const featureFlags = {
  isAIEnabled: async () => getRemoteBoolean("ai_features_enabled", true),
  isSemanticSearchEnabled: async () => getRemoteBoolean("semantic_search_enabled", false),
  isRAGEabled: async () => getRemoteBoolean("rag_enabled", false),
  isTelemedicineEnabled: async () => getRemoteBoolean("telemedicine_enabled", true),
  isGamificationEnabled: async () => getRemoteBoolean("gamification_enabled", true),
  isMaintenanceMode: async () => getRemoteBoolean("maintenance_mode", false),
  getMaxDailyAppointments: async () => getRemoteNumber("max_daily_appointments", 50),
  getBrandPrimaryColor: async () => getRemoteString("brand_primary_color", "#3b82f6"),
  isDebugLoggingEnabled: async () => getRemoteBoolean("debug_logging_enabled", import.meta.env.DEV),
  getOnboardingVariant: async () => getRemoteString("onboarding_variant", "v1"),
  showAISuggestions: async () => {
    const aiEnabled = await getRemoteBoolean("ai_features_enabled", true);
    const showSuggestions = await getRemoteBoolean("ai_show_suggestions", true);
    return aiEnabled && showSuggestions;
  },
};

export function useRemoteConfig() {
  return {
    config: DEFAULTS,
    loading: false,
    refresh: initRemoteConfig,
  };
}
