/**
 * Firebase Remote Config Feature Flags
 *
 * Dynamic feature flags without redeployment
 * Supports A/B testing, rollbacks, and gradual rollouts
 *
 * Migrated from Vercel Edge Config to Firebase Remote Config
 */

import { getRemoteConfig, getValue, fetchAndActivate, getAll } from 'firebase/remote-config';
import { firebaseApp } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number;
  allowedUsers?: string[];
  allowedRoles?: string[];
  description?: string;
}

export interface FeatureFlags {
  // Dashboard
  new_dashboard: boolean;
  new_dashboard_rollout?: number;

  // AI Features
  ai_transcription: boolean;
  ai_chatbot: boolean;
  ai_exercise_suggestions: boolean;

  // Clinical Features
  digital_prescription: boolean;
  pain_map_v2: boolean;
  soap_records_v2: boolean;

  // Analytics
  advanced_analytics: boolean;
  patient_reports_v2: boolean;

  // Integration
  whatsapp_notifications: boolean;
  google_calendar_sync: boolean;

  // System
  maintenance_mode: boolean;
  beta_features: boolean;
}

// Default feature flags
const DEFAULT_FLAGS: Partial<FeatureFlags> = {
  new_dashboard: false,
  ai_transcription: true,
  ai_chatbot: true,
  ai_exercise_suggestions: true,
  digital_prescription: true,
  pain_map_v2: false,
  soap_records_v2: false,
  advanced_analytics: true,
  patient_reports_v2: false,
  whatsapp_notifications: true,
  google_calendar_sync: true,
  maintenance_mode: false,
  beta_features: false,
};

/**
 * Get Firebase Remote Config instance
 */
function getRemoteConfigInstance() {
  const remoteConfig = getRemoteConfig(firebaseApp);

  // Set minimum fetch interval (in seconds)
  // For development: 0 (always fetch)
  // For production: 3600 (1 hour) or more
  if (import.meta.env.DEV) {
    remoteConfig.settings.minimumFetchIntervalMillis = 0;
  } else {
    remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
  }

  // Set fetch timeout (in milliseconds)
  remoteConfig.settings.fetchTimeoutMillis = 60000; // 1 minute

  return remoteConfig;
}

/**
 * Fetch and activate Remote Config
 */
export async function fetchRemoteConfig(): Promise<boolean> {
  try {
    const remoteConfig = getRemoteConfigInstance();
    return await fetchAndActivate(remoteConfig);
  } catch (error) {
    logger.error('Failed to fetch remote config', error, 'edgeConfig');
    return false;
  }
}

/**
 * Get all feature flags from Firebase Remote Config
 */
export async function getFeatureFlags(): Promise<Partial<FeatureFlags>> {
  try {
    // Try to fetch latest config (non-blocking)
    fetchRemoteConfig().catch(() => {
      // Silently fail - we'll use cached values
    });

    const remoteConfig = getRemoteConfigInstance();
    const allValues = getAll(remoteConfig);

    const flags: Partial<FeatureFlags> = {};
    for (const [key, value] of Object.entries(allValues)) {
      if (value.getSource() === 'remote') {
        const strValue = value.asString();
        flags[key as keyof FeatureFlags] = strValue === 'true' ? true :
          strValue === 'false' ? false :
          JSON.parse(strValue);
      }
    }

    // Merge with defaults
    return { ...DEFAULT_FLAGS, ...flags };
  } catch (error) {
    logger.error('Failed to fetch feature flags', error, 'edgeConfig');
    return DEFAULT_FLAGS;
  }
}

/**
 * Get a single feature flag value
 */
function getFlagValue(feature: keyof FeatureFlags): boolean | number | FeatureFlagConfig {
  try {
    const remoteConfig = getRemoteConfigInstance();
    const value = getValue(remoteConfig, feature);

    if (value.getSource() === 'static') {
      return DEFAULT_FLAGS[feature] ?? false;
    }

    const strValue = value.asString();

    // Try to parse as JSON first (for complex configs)
    try {
      return JSON.parse(strValue);
    } catch {
      // If not JSON, treat as boolean
      return strValue === 'true';
    }
  } catch (error) {
    logger.error(`Failed to get flag value for ${feature}`, error, 'edgeConfig');
    return DEFAULT_FLAGS[feature] ?? false;
  }
}

/**
 * Check if a specific feature is enabled
 */
export async function isFeatureEnabled(
  feature: keyof FeatureFlags,
  userId?: string,
  userRole?: string
): Promise<boolean> {
  try {
    const flagValue = getFlagValue(feature);

    // If flag doesn't exist, check defaults
    if (flagValue === undefined) {
      return DEFAULT_FLAGS[feature] ?? false;
    }

    // Simple boolean flag
    if (typeof flagValue === 'boolean') {
      return flagValue;
    }

    // Complex flag config
    if (typeof flagValue === 'object') {
      const config = flagValue as FeatureFlagConfig;

      // Check maintenance mode first
      if (feature !== 'maintenance_mode') {
        const maintenanceMode = await isFeatureEnabled('maintenance_mode');
        if (maintenanceMode) return false;
      }

      // Check if explicitly enabled
      if (!config.enabled) {
        return false;
      }

      // Check user whitelist
      if (config.allowedUsers && userId) {
        return config.allowedUsers.includes(userId);
      }

      // Check role whitelist
      if (config.allowedRoles && userRole) {
        return config.allowedRoles.includes(userRole);
      }

      // Check rollout percentage
      if (config.rolloutPercentage && userId) {
        const hash = hashUserId(userId);
        return hash < config.rolloutPercentage;
      }

      return config.enabled;
    }

    return false;
  } catch (error) {
    logger.error(`Failed to check feature flag ${feature}`, error, 'edgeConfig');
    return DEFAULT_FLAGS[feature] ?? false;
  }
}

/**
 * Hash user ID to a number between 0-100 for rollout percentage
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 101;
}

/**
 * Get multiple feature flags at once
 */
export async function getMultipleFeatures(
  features: (keyof FeatureFlags)[],
  userId?: string,
  userRole?: string
): Promise<Record<string, boolean>> {
  await getFeatureFlags();
  const result: Record<string, boolean> = {};

  for (const feature of features) {
    result[feature] = await isFeatureEnabled(feature, userId, userRole);
  }

  return result;
}

/**
 * React hook for feature flags
 */
export function useFeatureFlag(_feature: keyof FeatureFlags) {
  // This would be used in a React component
  // Implementation would use React Query or SWR
  return {
    data: false,
    isLoading: false,
    error: null,
  };
}

/**
 * Check if maintenance mode is active
 */
export async function isMaintenanceMode(): Promise<boolean> {
  return isFeatureEnabled('maintenance_mode');
}

/**
 * Get user-specific feature flags
 */
export async function getUserFeatures(
  userId: string,
  userRole: string
): Promise<Partial<FeatureFlags>> {
  const flags = await getFeatureFlags();
  const userFlags: Partial<FeatureFlags> = {};

  for (const [key] of Object.entries(flags)) {
    userFlags[key as keyof FeatureFlags] = await isFeatureEnabled(
      key as keyof FeatureFlags,
      userId,
      userRole
    );
  }

  return userFlags;
}

/**
 * Feature flag middleware for API routes
 */
export function withFeatureFlag(
  feature: keyof FeatureFlags,
  handler: (req: Request, ctx?: unknown) => Promise<Response>
) {
  return async (req: Request, ctx?: unknown): Promise<Response> => {
    const enabled = await isFeatureEnabled(feature);

    if (!enabled) {
      return new Response(
        JSON.stringify({
          error: 'Feature not enabled',
          feature,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return handler(req, ctx);
  };
}

/**
 * A/B testing helper
 */
export async function getABTestVariant(
  testName: string,
  userId: string
): Promise<string | null> {
  try {
    const remoteConfig = getRemoteConfigInstance();
    const value = getValue(remoteConfig, `ab_test:${testName}`);

    if (value.getSource() === 'static') {
      return null;
    }

    const variants = JSON.parse(value.asString());
    if (!variants) return null;

    const hash = hashUserId(userId);
    const threshold = hash;

    // Simple 50/50 split, can be enhanced
    if (threshold < 50) {
      return 'A';
    } else {
      return 'B';
    }
  } catch (error) {
    logger.error(`Failed to get A/B test variant for ${testName}`, error, 'edgeConfig');
    return null;
  }
}
