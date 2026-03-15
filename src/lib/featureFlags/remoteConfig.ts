/**
 * Feature flags sem remote config externo.
 */

import { fisioLogger as logger } from '@/lib/errors/logger';

export interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number;
  allowedUsers?: string[];
  allowedRoles?: string[];
  description?: string;
}

export interface FeatureFlags {
  new_dashboard: boolean;
  new_dashboard_rollout?: number;
  ai_transcription: boolean;
  ai_chatbot: boolean;
  ai_exercise_suggestions: boolean;
  digital_prescription: boolean;
  pain_map_v2: boolean;
  soap_records_v2: boolean;
  advanced_analytics: boolean;
  patient_reports_v2: boolean;
  whatsapp_notifications: boolean;
  google_calendar_sync: boolean;
  maintenance_mode: boolean;
  beta_features: boolean;
}

const DEFAULT_FLAGS: Partial<FeatureFlags> = {
  new_dashboard: false,
  ai_transcription: true,
  ai_chatbot: true,
  ai_exercise_suggestions: true,
  digital_prescription: true,
  pain_map_v2: false,
  soap_records_v2: true,
  advanced_analytics: true,
  patient_reports_v2: false,
  whatsapp_notifications: true,
  google_calendar_sync: true,
  maintenance_mode: false,
  beta_features: false,
};

function getStoredValue(feature: string): unknown {
  if (typeof window === 'undefined') return undefined;
  const raw = window.localStorage.getItem(`remote-config:${feature}`);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw === 'true' ? true : raw === 'false' ? false : raw;
  }
}

export async function fetchRemoteConfig(): Promise<boolean> {
  return true;
}

export async function getFeatureFlags(): Promise<Partial<FeatureFlags>> {
  return { ...DEFAULT_FLAGS };
}

function getFlagValue(feature: keyof FeatureFlags): boolean | number | FeatureFlagConfig {
  const stored = getStoredValue(feature);
  if (stored !== undefined) return stored as boolean | number | FeatureFlagConfig;
  return DEFAULT_FLAGS[feature] ?? false;
}

function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) hash = (hash << 5) - hash + userId.charCodeAt(i);
  return Math.abs(hash % 100);
}

export async function isFeatureEnabled(feature: keyof FeatureFlags, userId?: string, userRole?: string): Promise<boolean> {
  try {
    const flagValue = getFlagValue(feature);
    if (typeof flagValue === 'boolean') return flagValue;
    if (typeof flagValue === 'number') return flagValue > 0;

    const config = flagValue as FeatureFlagConfig;
    if (!config.enabled) return false;
    if (config.allowedUsers && userId) return config.allowedUsers.includes(userId);
    if (config.allowedRoles && userRole) return config.allowedRoles.includes(userRole);
    if (config.rolloutPercentage && userId) return hashUserId(userId) < config.rolloutPercentage;
    return config.enabled;
  } catch (error) {
    logger.error('Failed to check feature flag', error, 'remoteConfig');
    return DEFAULT_FLAGS[feature] ?? false;
  }
}
