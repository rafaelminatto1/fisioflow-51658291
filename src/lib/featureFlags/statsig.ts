/**
 * Statsig Integration for Feature Flags
 *
 * Free tier benefits:
 * - UNLIMITED feature flags
 * - 1M events/month free
 * - A/B testing included
 * - Analytics included
 *
 * This replaces environment variable-based feature flags
 * with a dynamic, analytics-backed system.
 *
 * @see https://www.statsig.com/docs
 */

import * as React from 'react';
import Statsig, { StatsigUser, StatsigOptions } from 'statsig-js';

// ============================================================================
// TYPES
// ============================================================================

export type FeatureFlagName =
  // Dashboard
  | 'new_dashboard'
  | 'dashboard_analytics_v2'
  // AI Features
  | 'ai_transcription'
  | 'ai_chatbot'
  | 'ai_exercise_suggestions'
  | 'ai_clinsight_insights'
  // Clinical Features
  | 'digital_prescription'
  | 'pain_map_v2'
  | 'soap_records_v2'
  | 'exercise_library_v2'
  // Analytics
  | 'advanced_analytics'
  | 'patient_reports_v2'
  | 'performance_metrics'
  // Integration
  | 'whatsapp_notifications'
  | 'google_calendar_sync'
  | 'email_reminders'
  // System
  | 'maintenance_mode'
  | 'beta_features'
  | 'dark_mode';

export type DynamicConfigName =
  | 'ai_models_config'
  | 'appointment_settings'
  | 'notification_preferences'
  | 'ui_configuration'
  | 'experiment_allocation';

export interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number;
  rules?: Array<{
    id: string;
    name: string;
    conditions: Record<string, unknown>[];
    return_value: boolean;
  }>;
}

export interface DynamicConfigValue {
  [key: string]: unknown;
}

export interface ExperimentConfig {
  experimentName: string;
  parameterName: string;
}

// ============================================================================
// STATSIG INITIALIZATION
// ============================================================================

// DISABLED: Statsig SDK is disabled to prevent runtime errors
// Set to false to always use default values without calling the SDK
let isInitialized = false;
const STATSIG_DISABLED = true; // Master switch to disable all Statsig SDK calls

/**
 * Initialize Statsig SDK
 * DISABLED: Always returns false to prevent SDK calls
 */
export async function initStatsig(
  _sdkKey?: string,
  _user?: Statsig.StatsigUser
): Promise<boolean> {
  // Statsig is disabled - always return false
  if (STATSIG_DISABLED) {
    console.info('[Statsig] SDK is disabled. Using default values for all feature flags.');
    return false;
  }

  if (isInitialized) {
    console.warn('Statsig already initialized');
    return true;
  }

  const key = _sdkKey || import.meta.env.VITE_STATSIG_CLIENT_KEY || import.meta.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY;

  if (!key) {
    console.warn('Statsig SDK key not found. Feature flags disabled.');
    return false;
  }

  try {
    // In statsig-react v2, the StatsigProvider handles initialization
    // We just mark it as initialized here for our internal tracking
    isInitialized = true;
    console.info('Statsig ready (initialization delegated to StatsigProvider)');
    return true;
  } catch (error) {
    console.error('Failed to initialize Statsig:', error);
    return false;
  }
}

/**
 * Shutdown Statsig SDK
 */
export function shutdownStatsig(): void {
  if (isInitialized) {
    isInitialized = false;
  }
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(
  flagName: FeatureFlagName,
  _user?: Statsig.StatsigUser,
  _options?: Statsig.StatsigOptions
): boolean {
  // Always return default value when Statsig is disabled
  if (STATSIG_DISABLED || !isInitialized) {
    return getDefaultFlagValue(flagName);
  }

  try {
    // Note: statsig-js checkGate signature is (gateName, ignoreOverrides?)
    // User is set during initialize() or updateUser()
    return Statsig.checkGate(flagName);
  } catch (error) {
    console.error(`Error checking gate ${flagName}:`, error);
    return getDefaultFlagValue(flagName);
  }
}

/**
 * Get feature flag with metadata
 * Note: getGateEvaluation doesn't exist in statsig-js, returning just enabled status
 */
export function getFeatureFlagMetadata(
  flagName: FeatureFlagName,
  user?: Statsig.StatsigUser
): { enabled: boolean; metadata?: Record<string, unknown> } {
  if (!isInitialized) {
    return {
      enabled: getDefaultFlagValue(flagName),
    };
  }

  try {
    const enabled = isFeatureEnabled(flagName, user);
    // statsig-js doesn't have getGateEvaluation, just return enabled status
    return { enabled };
  } catch (error) {
    console.error(`Error getting gate metadata ${flagName}:`, error);
    return {
      enabled: getDefaultFlagValue(flagName),
    };
  }
}

/**
 * Get multiple feature flags at once
 */
export function getMultipleFeatureFlags(
  flagNames: FeatureFlagName[],
  user?: Statsig.StatsigUser
): Record<FeatureFlagName, boolean> {
  const result: Partial<Record<FeatureFlagName, boolean>> = {};

  for (const flagName of flagNames) {
    result[flagName] = isFeatureEnabled(flagName, user);
  }

  return result as Record<FeatureFlagName, boolean>;
}

// ============================================================================
// DYNAMIC CONFIG
// ============================================================================

/**
 * Get dynamic configuration value
 */
export function getDynamicConfig<T = DynamicConfigValue>(
  configName: DynamicConfigName,
  _user?: Statsig.StatsigUser
): T | null {
  // Always return default value when Statsig is disabled
  if (STATSIG_DISABLED || !isInitialized) {
    return getDefaultConfigValue<T>(configName);
  }

  try {
    // Note: statsig-js getConfig signature is (configName, ignoreOverrides?)
    const config = Statsig.getConfig(configName);
    return (config?.value as T) || null;
  } catch (error) {
    console.error(`Error getting config ${configName}:`, error);
    return getDefaultConfigValue<T>(configName);
  }
}

/**
 * Get specific value from dynamic config
 */
export function getConfigValue<T = unknown>(
  configName: DynamicConfigName,
  key: string,
  defaultValue?: T,
  user?: Statsig.StatsigUser
): T | undefined {
  const config = getDynamicConfig<Record<string, T>>(configName, user);

  if (config && key in config) {
    return config[key];
  }

  return defaultValue;
}

// ============================================================================
// EXPERIMENTS
// ============================================================================

/**
 * Get experiment variant
 */
export function getExperiment<T = string>(
  experimentName: string,
  _user?: Statsig.StatsigUser
): { value: T; name: string } | null {
  // Always return null when Statsig is disabled
  if (STATSIG_DISABLED || !isInitialized) {
    return null;
  }

  try {
    // Note: statsig-js getExperiment signature is (experimentName, keepDeviceValue?, ignoreOverrides?)
    const experiment = Statsig.getExperiment(experimentName);
    return {
      value: experiment?.value as T,
      name: experimentName,
    };
  } catch (error) {
    console.error(`Error getting experiment ${experimentName}:`, error);
    return null;
  }
}

/**
 * Log experiment exposure
 */
export function logExperimentExposure(
  experimentName: string,
  _user?: Statsig.StatsigUser
): void {
  // Skip when Statsig is disabled
  if (STATSIG_DISABLED || !isInitialized) return;

  try {
    // In statsig-js, experiment exposure is logged automatically when getExperiment is called
    // This is a no-op for manual logging as manuallyLogExperiment doesn't exist
    console.debug(`[Statsig] Experiment exposure logged: ${experimentName}`);
  } catch (error) {
    console.error(`Error logging experiment exposure ${experimentName}:`, error);
  }
}

// ============================================================================
// ANALYTICS EVENTS
// ============================================================================

/**
 * Log custom event
 */
export function logEvent(
  eventName: string,
  value?: number,
  metadata?: Record<string, string | number | boolean | null>
): void {
  // Skip when Statsig is disabled
  if (STATSIG_DISABLED || !isInitialized) {
    // Silent skip - no need to log debug messages in production
    return;
  }

  try {
    Statsig.logEvent(eventName, value, metadata);
  } catch (error) {
    console.error(`Error logging event ${eventName}:`, error);
  }
}

// FisioFlow-specific event logging
export const Analytics = {
  // Appointment events
  appointmentCreated: (appointmentId: string, therapistId: string) =>
    logEvent('appointment_created', undefined, { appointmentId, therapistId }),

  appointmentCompleted: (appointmentId: string, therapistId: string, duration: number) =>
    logEvent('appointment_completed', duration, { appointmentId, therapistId }),

  // Patient events
  patientCreated: (patientId: string, therapistId: string) =>
    logEvent('patient_created', undefined, { patientId, therapistId }),

  // AI events
  aiAnalysisGenerated: (type: string, tokensUsed: number) =>
    logEvent('ai_analysis_generated', tokensUsed, { type }),

  aiChatMessage: (messageLength: number) =>
    logEvent('ai_chat_message', messageLength),

  // Feature usage
  featureUsed: (featureName: string) =>
    logEvent('feature_used', undefined, { feature: featureName }),

  // Clinical events
  exercisePrescribed: (exerciseId: string, patientId: string) =>
    logEvent('exercise_prescribed', undefined, { exerciseId, patientId }),

  reportGenerated: (reportType: string, therapistId: string) =>
    logEvent('report_generated', undefined, { type: reportType, therapistId }),

  // Page views
  pageViewed: (pageName: string) =>
    logEvent('page_viewed', undefined, { page: pageName }),
};

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Update current user
 */
export function updateUser(user: Statsig.StatsigUser): void {
  // Skip when Statsig is disabled
  if (STATSIG_DISABLED || !isInitialized) return;

  try {
    Statsig.updateUser(user);
  } catch (error) {
    console.error('Error updating Statsig user:', error);
  }
}

/**
 * Log user out
 */
export function logUserOut(): void {
  // Skip when Statsig is disabled
  if (STATSIG_DISABLED || !isInitialized) return;

  try {
    Statsig.shutdown();
    isInitialized = false;
  } catch (error) {
    console.error('Error during Statsig logout:', error);
  }
}

// ============================================================================
// DEFAULT VALUES (Fallbacks when Statsig is unavailable)
// ============================================================================

function getDefaultFlagValue(flagName: FeatureFlagName): boolean {
  const defaults: Record<FeatureFlagName, boolean> = {
    // Dashboard
    new_dashboard: false,
    dashboard_analytics_v2: true,

    // AI Features - enabled by default for FisioFlow
    ai_transcription: true,
    ai_chatbot: true,
    ai_exercise_suggestions: true,
    ai_clinsight_insights: true,

    // Clinical Features
    digital_prescription: true,
    pain_map_v2: false,
    soap_records_v2: false,
    exercise_library_v2: false,

    // Analytics
    advanced_analytics: true,
    patient_reports_v2: false,
    performance_metrics: true,

    // Integration
    whatsapp_notifications: true,
    google_calendar_sync: true,
    email_reminders: true,

    // System
    maintenance_mode: false,
    beta_features: false,
    dark_mode: true,
  };

  return defaults[flagName] ?? false;
}

function getDefaultConfigValue<T>(configName: DynamicConfigName): T | null {
  const defaults: Record<DynamicConfigName, unknown> = {
    ai_models_config: {
      clinical_analysis: { provider: 'google', model: 'gemini-2.0-flash-exp' },
      chat: { provider: 'google', model: 'gemini-2.0-flash-exp' },
      transcription: { provider: 'openai', model: 'whisper-1' },
    },
    appointment_settings: {
      defaultDuration: 60,
      bufferTime: 15,
      maxPerDay: 20,
    },
    notification_preferences: {
      remindersEnabled: true,
      reminderHoursBefore: [24, 2],
      channels: ['email', 'whatsapp'],
    },
    ui_configuration: {
      theme: 'system',
      compactMode: false,
      sidebarCollapsed: false,
    },
    experiment_allocation: {
      ai_suggestions_ab_test: 'control',
      dashboard_layout: 'classic',
    },
  };

  return (defaults[configName] ?? null) as T | null;
}

// ============================================================================
// REACT HOOKS FACTORY
// ============================================================================

/**
 * Factory for creating typed hooks
 * Note: statsig-react v2 doesn't have subscription APIs, values update via provider
 */
export function createFeatureFlagHook(flagName: FeatureFlagName) {
  return function useFeatureFlag(
    _user?: Statsig.StatsigUser,
    _options?: Statsig.StatsigOptions
  ): { enabled: boolean; isLoading: boolean; error: Error | null } {
    // Always use default values when Statsig is disabled
    const [enabled] = React.useState(() => getDefaultFlagValue(flagName));
    const [isLoading] = React.useState(false);

    // No need for useEffect - Statsig is disabled, just return defaults
    return { enabled, isLoading, error: null };
  };
}

/**
 * Factory for creating dynamic config hooks
 * Note: statsig-react v2 doesn't have subscription APIs, values update via provider
 */
export function createDynamicConfigHook<T = DynamicConfigValue>(configName: DynamicConfigName) {
  return function useDynamicConfig(
    _user?: Statsig.StatsigUser
  ): { config: T | null; isLoading: boolean; error: Error | null } {
    // Always use default values when Statsig is disabled
    const [config] = React.useState<T | null>(() => getDefaultConfigValue<T>(configName));
    const [isLoading] = React.useState(false);

    // No need for useEffect - Statsig is disabled, just return defaults
    return { config, isLoading, error: null };
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const StatsigService = {
  // Initialization
  init: initStatsig,
  shutdown: shutdownStatsig,

  // Feature flags
  isFeatureEnabled,
  getFeatureFlagMetadata,
  getMultipleFeatureFlags,

  // Dynamic config
  getDynamicConfig,
  getConfigValue,

  // Experiments
  getExperiment,
  logExperimentExposure,

  // Analytics
  logEvent,
  Analytics,

  // User management
  updateUser,
  logUserOut,

  // Hook factories
  createFeatureFlagHook,
  createDynamicConfigHook,

  // Utilities
  isInitialized: () => isInitialized,
};

// Re-export Statsig utilities for convenience
export { Statsig };
export type { StatsigUser, StatsigOptions };
