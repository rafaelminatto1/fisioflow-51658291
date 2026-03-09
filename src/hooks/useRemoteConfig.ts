/**
 * Hook para gerenciar configurações dinâmicas e Feature Flags
 *
 * Migrado para env/local overrides, sem Firebase Remote Config.
 */

import { useEffect, useMemo, useState } from 'react';

function readOverride(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(`remote-config:${key}`);
  } catch {
    return null;
  }
}

function readEnv(key: string): string | undefined {
  const envKey = `VITE_${key.toUpperCase()}`;
  return (import.meta.env as Record<string, string | undefined>)[envKey];
}

function normalizeValue(raw: string | null | undefined, defaultValue: unknown): unknown {
  if (raw == null) return defaultValue;

  if (typeof defaultValue === 'boolean') {
    return raw === 'true';
  }

  if (typeof defaultValue === 'number') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  return raw;
}

export const useRemoteConfig = (key: string, defaultValue: unknown) => {
  const resolvedDefault = useMemo(
    () => normalizeValue(readEnv(key), defaultValue),
    [key, defaultValue],
  );
  const [value, setValue] = useState(resolvedDefault);

  useEffect(() => {
    setValue(normalizeValue(readOverride(key) ?? readEnv(key), defaultValue));
  }, [key, defaultValue]);

  return value;
};

export const useFeatureFlags = () => {
  const enableAI = useRemoteConfig('feature_ai_summary', true) as boolean;
  const enableGoniometry = useRemoteConfig('feature_goniometry_v2', false) as boolean;
  const maintenanceMode = useRemoteConfig('maintenance_mode', false) as boolean;

  return { enableAI, enableGoniometry, maintenanceMode };
};
