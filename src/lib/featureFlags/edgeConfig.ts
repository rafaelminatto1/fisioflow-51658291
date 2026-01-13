/**
 * Vercel Edge Config Feature Flags
 *
 * Dynamic feature flags without redeployment
 * Supports A/B testing, rollbacks, and gradual rollouts
 */

import { get } from '@vercel/edge-config';

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

/**
 * Get all feature flags from Edge Config
 */
export async function getFeatureFlags(): Promise<Partial<FeatureFlags>> {
  try {
    const flags = await get('features');
    return (flags as Partial<FeatureFlags>) || {};
  } catch (error) {
    console.error('Failed to fetch feature flags:', error);
    // Return default flags if Edge Config is not available
    return {
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
    const flags = await getFeatureFlags();
    const flagConfig = flags[feature];

    // If flag doesn't exist, default to false
    if (flagConfig === undefined) {
      return false;
    }

    // Simple boolean flag
    if (typeof flagConfig === 'boolean') {
      return flagConfig;
    }

    // Complex flag config (future enhancement)
    if (typeof flagConfig === 'object') {
      const config = flagConfig as FeatureFlagConfig;

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
    console.error(`Failed to check feature flag ${feature}:`, error);
    return false;
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
    const variants = await get(`ab_test:${testName}`);
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
    console.error(`Failed to get A/B test variant for ${testName}:`, error);
    return null;
  }
}
