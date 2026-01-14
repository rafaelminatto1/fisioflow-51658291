/**
 * Feature Flags - Static Replacement for Statsig
 *
 * This replaces the Statsig integration with static default values
 * to verify if Statsig was causing production issues.
 */

import * as React from 'react';

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

// Dummy types for compatibility
export type StatsigUser = {
  userID?: string;
  email?: string;
  [key: string]: unknown;
};

export type StatsigOptions = Record<string, unknown>;

// ============================================================================
// STATSIG INITIALIZATION (MOCKED)
// ============================================================================

let isInitialized = false;

export async function initStatsig(
  _sdkKey?: string,
  _user?: StatsigUser
): Promise<boolean> {
  console.info('[FeatureFlags] Using static defaults (Statsig removed)');
  isInitialized = true;
  return true;
}

export function shutdownStatsig(): void {
  isInitialized = false;
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export function isFeatureEnabled(
  flagName: FeatureFlagName,
  _user?: StatsigUser,
  _options?: StatsigOptions
): boolean {
  return getDefaultFlagValue(flagName);
}

export function getFeatureFlagMetadata(
  flagName: FeatureFlagName,
  user?: StatsigUser
): { enabled: boolean; metadata?: Record<string, unknown> } {
  return {
    enabled: getDefaultFlagValue(flagName),
  };
}

export function getMultipleFeatureFlags(
  flagNames: FeatureFlagName[],
  user?: StatsigUser
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

export function getDynamicConfig<T = DynamicConfigValue>(
  configName: DynamicConfigName,
  _user?: StatsigUser
): T | null {
  return getDefaultConfigValue<T>(configName);
}

export function getConfigValue<T = unknown>(
  configName: DynamicConfigName,
  key: string,
  defaultValue?: T,
  user?: StatsigUser
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

export function getExperiment<T = string>(
  experimentName: string,
  _user?: StatsigUser
): { value: T; name: string } | null {
  return null;
}

export function logExperimentExposure(
  experimentName: string,
  _user?: StatsigUser
): void {
  // No-op
}

// ============================================================================
// ANALYTICS EVENTS
// ============================================================================

export function logEvent(
  eventName: string,
  value?: number,
  metadata?: Record<string, string | number | boolean | null>
): void {
  // Silent no-op
}

export const Analytics = {
  appointmentCreated: (appointmentId: string, therapistId: string) => { },
  appointmentCompleted: (appointmentId: string, therapistId: string, duration: number) => { },
  patientCreated: (patientId: string, therapistId: string) => { },
  aiAnalysisGenerated: (type: string, tokensUsed: number) => { },
  aiChatMessage: (messageLength: number) => { },
  featureUsed: (featureName: string) => { },
  exercisePrescribed: (exerciseId: string, patientId: string) => { },
  reportGenerated: (reportType: string, therapistId: string) => { },
  pageViewed: (pageName: string) => { },
};

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export function updateUser(user: StatsigUser): void { }

export function logUserOut(): void {
  isInitialized = false;
}

// ============================================================================
// DEFAULT VALUES
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

export function createFeatureFlagHook(flagName: FeatureFlagName) {
  return function useFeatureFlag(
    _user?: StatsigUser,
    _options?: StatsigOptions
  ): { enabled: boolean; isLoading: boolean; error: Error | null } {
    const [enabled] = React.useState(() => getDefaultFlagValue(flagName));
    const [isLoading] = React.useState(false);
    return { enabled, isLoading, error: null };
  };
}

export function createDynamicConfigHook<T = DynamicConfigValue>(configName: DynamicConfigName) {
  return function useDynamicConfig(
    _user?: StatsigUser
  ): { config: T | null; isLoading: boolean; error: Error | null } {
    const [config] = React.useState<T | null>(() => getDefaultConfigValue<T>(configName));
    const [isLoading] = React.useState(false);
    return { config, isLoading, error: null };
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const StatsigService = {
  init: initStatsig,
  shutdown: shutdownStatsig,
  isFeatureEnabled,
  getFeatureFlagMetadata,
  getMultipleFeatureFlags,
  getDynamicConfig,
  getConfigValue,
  getExperiment,
  logExperimentExposure,
  logEvent,
  Analytics,
  updateUser,
  logUserOut,
  createFeatureFlagHook,
  createDynamicConfigHook,
  isInitialized: () => isInitialized,
};

// Named dummy export to match previous import * as Statsig usage
export const Statsig = {
  checkGate: () => false,
  getConfig: () => null,
  getExperiment: () => null,
  logEvent: () => { },
  updateUser: () => { },
  shutdown: () => { },
};
