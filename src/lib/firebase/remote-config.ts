/**
 * Firebase Remote Config - Feature Flags Complete
 *
 * Substitui Vercel Edge Config com Firebase Remote Config
 * Gerencia todas as feature flags da aplicação
 *
 * @module lib/firebase/remote-config
 */

import {
  getRemoteConfig,
  fetchAndActivate,
  getValue,
  getBoolean,
  getNumber,
  getString,
  getAll,
  setLogLevel,
  type RemoteConfig,
} from 'firebase/remote-config';
import { app } from '@/integrations/firebase/app';
import { logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number;
  allowedUsers?: string[];
  allowedRoles?: string[];
  description?: string;
}

export type FeatureFlagName =
  // Dashboard
  | 'new_dashboard'
  | 'dashboard_v2'
  // AI Features
  | 'ai_transcription'
  | 'ai_chatbot'
  | 'ai_exercise_suggestions'
  | 'ai_clinical_analysis'
  | 'ai_treatment_planning'
  | 'ai_patient_chat'
  | 'ai_progress_analysis'
  // Clinical Features
  | 'digital_prescription'
  | 'pain_map_v2'
  | 'soap_records_v2'
  | 'telemedicine_enabled'
  | 'exercise_prescription_v2'
  // Analytics
  | 'advanced_analytics'
  | 'patient_reports_v2'
  | 'revenue_analytics'
  // Integration
  | 'whatsapp_notifications'
  | 'google_calendar_sync'
  | 'stripe_integration'
  | 'email_notifications'
  // System
  | 'maintenance_mode'
  | 'beta_features'
  | 'debug_mode'
  | 'new_onboarding';

// ============================================================================
// REMOTE CONFIG KEYS
// ============================================================================

export const REMOTE_CONFIG_KEYS = {
  // Dashboard
  NEW_DASHBOARD: 'new_dashboard',
  DASHBOARD_V2: 'dashboard_v2',

  // AI Features
  AI_ENABLED: 'ai_enabled',
  AI_TRANSCRIPTION: 'ai_transcription',
  AI_CHATBOT: 'ai_chatbot',
  AI_EXERCISE_SUGGESTIONS: 'ai_exercise_suggestions',
  AI_CLINICAL_ANALYSIS: 'ai_clinical_analysis',
  AI_TREATMENT_PLANNING: 'ai_treatment_planning',
  AI_PATIENT_CHAT: 'ai_patient_chat',
  AI_PROGRESS_ANALYSIS: 'ai_progress_analysis',

  // AI Model Selection
  AI_DEFAULT_MODEL: 'ai_default_model',
  AI_CLINICAL_MODEL: 'ai_clinical_model',
  AI_EXERCISE_MODEL: 'ai_exercise_model',
  AI_TREATMENT_MODEL: 'ai_treatment_model',
  AI_CHAT_MODEL: 'ai_chat_model',
  AI_ANALYSIS_MODEL: 'ai_analysis_model',
  AI_QUICK_MODEL: 'ai_quick_model',

  // AI Rate Limiting
  AI_MAX_REQUESTS_PER_HOUR: 'ai_max_requests_per_hour',
  AI_MAX_REQUESTS_PER_DAY: 'ai_max_requests_per_day',
  AI_MAX_TOKENS_PER_REQUEST: 'ai_max_tokens_per_request',

  // AI Cost Controls
  AI_DAILY_BUDGET_LIMIT: 'ai_daily_budget_limit',
  AI_MONTHLY_BUDGET_LIMIT: 'ai_monthly_budget_limit',

  // AI Quality Controls
  AI_MIN_TEMPERATURE: 'ai_min_temperature',
  AI_MAX_TEMPERATURE: 'ai_max_temperature',
  AI_DEFAULT_MAX_TOKENS: 'ai_default_max_tokens',

  // AI Advanced Settings
  AI_ENABLE_STREAMING: 'ai_enable_streaming',
  AI_ENABLE_FUNCTION_CALLING: 'ai_enable_function_calling',
  AI_ENABLE_MULTIMODAL: 'ai_enable_multimodal',
  AI_TIMEOUT_MS: 'ai_timeout_ms',

  // Clinical Features
  DIGITAL_PRESCRIPTION: 'digital_prescription',
  PAIN_MAP_V2: 'pain_map_v2',
  SOAP_RECORDS_V2: 'soap_records_v2',
  TELEMEDICINE_ENABLED: 'telemedicine_enabled',
  EXERCISE_PRESCRIPTION_V2: 'exercise_prescription_v2',

  // Analytics
  ADVANCED_ANALYTICS: 'advanced_analytics',
  PATIENT_REPORTS_V2: 'patient_reports_v2',
  REVENUE_ANALYTICS: 'revenue_analytics',

  // Integration
  WHATSAPP_NOTIFICATIONS: 'whatsapp_notifications',
  GOOGLE_CALENDAR_SYNC: 'google_calendar_sync',
  STRIPE_INTEGRATION: 'stripe_integration',
  EMAIL_NOTIFICATIONS: 'email_notifications',

  // System
  MAINTENANCE_MODE: 'maintenance_mode',
  BETA_FEATURES: 'beta_features',
  DEBUG_MODE: 'debug_mode',
  NEW_ONBOARDING: 'new_onboarding',
} as const;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const REMOTE_CONFIG_DEFAULTS: Record<string, string | number | boolean> = {
  // Dashboard
  [REMOTE_CONFIG_KEYS.NEW_DASHBOARD]: false,
  [REMOTE_CONFIG_KEYS.DASHBOARD_V2]: false,

  // AI Features - enabled by default
  [REMOTE_CONFIG_KEYS.AI_ENABLED]: true,
  [REMOTE_CONFIG_KEYS.AI_TRANSCRIPTION]: true,
  [REMOTE_CONFIG_KEYS.AI_CHATBOT]: true,
  [REMOTE_CONFIG_KEYS.AI_EXERCISE_SUGGESTIONS]: true,
  [REMOTE_CONFIG_KEYS.AI_CLINICAL_ANALYSIS]: true,
  [REMOTE_CONFIG_KEYS.AI_TREATMENT_PLANNING]: true,
  [REMOTE_CONFIG_KEYS.AI_PATIENT_CHAT]: true,
  [REMOTE_CONFIG_KEYS.AI_PROGRESS_ANALYSIS]: true,

  // AI Model Selection (Gemini models)
  [REMOTE_CONFIG_KEYS.AI_DEFAULT_MODEL]: 'gemini-2.5-flash',
  [REMOTE_CONFIG_KEYS.AI_CLINICAL_MODEL]: 'gemini-2.5-pro',
  [REMOTE_CONFIG_KEYS.AI_EXERCISE_MODEL]: 'gemini-2.5-flash',
  [REMOTE_CONFIG_KEYS.AI_TREATMENT_MODEL]: 'gemini-2.5-pro',
  [REMOTE_CONFIG_KEYS.AI_CHAT_MODEL]: 'gemini-2.5-flash-lite',
  [REMOTE_CONFIG_KEYS.AI_ANALYSIS_MODEL]: 'gemini-2.5-flash',
  [REMOTE_CONFIG_KEYS.AI_QUICK_MODEL]: 'gemini-2.5-flash-lite',

  // AI Rate Limiting
  [REMOTE_CONFIG_KEYS.AI_MAX_REQUESTS_PER_HOUR]: 100,
  [REMOTE_CONFIG_KEYS.AI_MAX_REQUESTS_PER_DAY]: 1000,
  [REMOTE_CONFIG_KEYS.AI_MAX_TOKENS_PER_REQUEST]: 8192,

  // AI Cost Controls (USD)
  [REMOTE_CONFIG_KEYS.AI_DAILY_BUDGET_LIMIT]: 50,
  [REMOTE_CONFIG_KEYS.AI_MONTHLY_BUDGET_LIMIT]: 1000,

  // AI Quality Controls
  [REMOTE_CONFIG_KEYS.AI_MIN_TEMPERATURE]: 0.1,
  [REMOTE_CONFIG_KEYS.AI_MAX_TEMPERATURE]: 1.0,
  [REMOTE_CONFIG_KEYS.AI_DEFAULT_MAX_TOKENS]: 2048,

  // AI Advanced Settings
  [REMOTE_CONFIG_KEYS.AI_ENABLE_STREAMING]: true,
  [REMOTE_CONFIG_KEYS.AI_ENABLE_FUNCTION_CALLING]: true,
  [REMOTE_CONFIG_KEYS.AI_ENABLE_MULTIMODAL]: true,
  [REMOTE_CONFIG_KEYS.AI_TIMEOUT_MS]: 30000,

  // Clinical Features
  [REMOTE_CONFIG_KEYS.DIGITAL_PRESCRIPTION]: true,
  [REMOTE_CONFIG_KEYS.PAIN_MAP_V2]: false,
  [REMOTE_CONFIG_KEYS.SOAP_RECORDS_V2]: true, // Já migrado para Firebase
  [REMOTE_CONFIG_KEYS.TELEMEDICINE_ENABLED]: true,
  [REMOTE_CONFIG_KEYS.EXERCISE_PRESCRIPTION_V2]: true,

  // Analytics
  [REMOTE_CONFIG_KEYS.ADVANCED_ANALYTICS]: true,
  [REMOTE_CONFIG_KEYS.PATIENT_REPORTS_V2]: false,
  [REMOTE_CONFIG_KEYS.REVENUE_ANALYTICS]: true,

  // Integration
  [REMOTE_CONFIG_KEYS.WHATSAPP_NOTIFICATIONS]: true,
  [REMOTE_CONFIG_KEYS.GOOGLE_CALENDAR_SYNC]: true,
  [REMOTE_CONFIG_KEYS.STRIPE_INTEGRATION]: true,
  [REMOTE_CONFIG_KEYS.EMAIL_NOTIFICATIONS]: true,

  // System
  [REMOTE_CONFIG_KEYS.MAINTENANCE_MODE]: false,
  [REMOTE_CONFIG_KEYS.BETA_FEATURES]: false,
  [REMOTE_CONFIG_KEYS.DEBUG_MODE]: false,
  [REMOTE_CONFIG_KEYS.NEW_ONBOARDING]: false,
} as const;

// ============================================================================
// REMOTE CONFIG MANAGER
// ============================================================================

class RemoteConfigManager {
  private remoteConfig: RemoteConfig | null = null;
  private initialized = false;
  private cacheDuration: number;
  private minimumFetchInterval: number;

  constructor(cacheDuration = 3600000, minimumFetchInterval = 600000) {
    this.cacheDuration = cacheDuration;
    this.minimumFetchInterval = minimumFetchInterval;
  }

  /**
   * Initialize Remote Config
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.remoteConfig = getRemoteConfig(app);

      // Configure settings
      this.remoteConfig.settings = {
        minimumFetchIntervalMillis: this.minimumFetchInterval,
        fetchTimeoutMillis: 60000, // 1 minute
      };

      // Set log level based on environment
      if (import.meta.env.DEV) {
        setLogLevel('debug');
      } else {
        setLogLevel('silent');
      }

      // Fetch and activate remote config
      await fetchAndActivate(this.remoteConfig);

      this.initialized = true;
      logger.info('Firebase Remote Config initialized successfully', undefined, 'remote-config');
    } catch (error) {
      logger.error('Failed to initialize Remote Config', error, 'remote-config');
      // Don't throw - allow app to continue with defaults
      this.initialized = true;
    }
  }

  /**
   * Check if a feature is enabled (simple boolean check)
   */
  isFeatureEnabled(feature: FeatureFlagName): boolean {
    if (!this.remoteConfig) {
      return REMOTE_CONFIG_DEFAULTS[feature] as boolean ?? false;
    }

    // Check maintenance mode first (except for maintenance_mode itself)
    if (feature !== 'maintenance_mode') {
      const maintenanceMode = this.getBoolean(REMOTE_CONFIG_KEYS.MAINTENANCE_MODE);
      if (maintenanceMode) return false;
    }

    return this.getBoolean(this.getKeyForFeature(feature));
  }

  /**
   * Get feature flag config (with rollout support)
   */
  getFeatureConfig(feature: FeatureFlagName): FeatureFlagConfig {
    const enabled = this.isFeatureEnabled(feature);

    // For advanced config with rollout, we'd need JSON support
    // For now, return simple config
    return {
      enabled,
      description: this.getDescriptionForFeature(feature),
    };
  }

  /**
   * Check if feature is enabled for specific user (with rollout)
   */
  isFeatureEnabledForUser(feature: FeatureFlagName, userId: string): boolean {
    const config = this.getFeatureConfig(feature);

    if (!config.enabled) {
      return false;
    }

    // If rollout percentage is set, check user hash
    if (config.rolloutPercentage) {
      const hash = this.hashUserId(userId);
      return hash < config.rolloutPercentage;
    }

    // Check allowed users
    if (config.allowedUsers && config.allowedUsers.includes(userId)) {
      return true;
    }

    return config.enabled;
  }

  /**
   * Check multiple features at once
   */
  getMultipleFeatures(features: FeatureFlagName[]): Record<FeatureFlagName, boolean> {
    const result: Record<string, boolean> = {};

    for (const feature of features) {
      result[feature] = this.isFeatureEnabled(feature);
    }

    return result as Record<FeatureFlagName, boolean>;
  }

  /**
   * Get all feature flags
   */
  getAllFeatures(): Partial<Record<FeatureFlagName, boolean>> {
    const features: FeatureFlagName[] = [
      'new_dashboard',
      'dashboard_v2',
      'ai_transcription',
      'ai_chatbot',
      'ai_exercise_suggestions',
      'digital_prescription',
      'pain_map_v2',
      'soap_records_v2',
      'advanced_analytics',
      'patient_reports_v2',
      'whatsapp_notifications',
      'google_calendar_sync',
      'maintenance_mode',
      'beta_features',
    ];

    return this.getMultipleFeatures(features);
  }

  /**
   * Get string value
   */
  getString(key: string): string {
    if (!this.remoteConfig) {
      return REMOTE_CONFIG_DEFAULTS[key] as string ?? '';
    }
    return getString(this.remoteConfig, key);
  }

  /**
   * Get boolean value
   */
  getBoolean(key: string): boolean {
    if (!this.remoteConfig) {
      return REMOTE_CONFIG_DEFAULTS[key] as boolean ?? false;
    }
    return getBoolean(this.remoteConfig, key);
  }

  /**
   * Get number value
   */
  getNumber(key: string): number {
    if (!this.remoteConfig) {
      return REMOTE_CONFIG_DEFAULTS[key] as number ?? 0;
    }
    return getNumber(this.remoteConfig, key);
  }

  /**
   * Get all config values
   */
  getAllConfig(): Record<string, string | number | boolean> {
    if (!this.remoteConfig) {
      return { ...REMOTE_CONFIG_DEFAULTS };
    }

    const allValues = getAll(this.remoteConfig);
    const config: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(allValues)) {
      if (typeof value === 'object' && 'asString' in value) {
        config[key] = value.asString();
      } else {
        config[key] = value as string | number | boolean;
      }
    }

    return config;
  }

  /**
   * Refresh remote config
   */
  async refresh(): Promise<boolean> {
    if (!this.remoteConfig) {
      await this.initialize();
      return true;
    }

    try {
      return await fetchAndActivate(this.remoteConfig);
    } catch (error) {
      logger.error('Failed to refresh Remote Config', error, 'remote-config');
      return false;
    }
  }

  /**
   * Hash user ID to number between 0-100 for rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 101;
  }

  /**
   * Get Remote Config key for feature name
   */
  private getKeyForFeature(feature: FeatureFlagName): string {
    const keyMap: Record<FeatureFlagName, string> = {
      new_dashboard: REMOTE_CONFIG_KEYS.NEW_DASHBOARD,
      dashboard_v2: REMOTE_CONFIG_KEYS.DASHBOARD_V2,
      ai_transcription: REMOTE_CONFIG_KEYS.AI_TRANSCRIPTION,
      ai_chatbot: REMOTE_CONFIG_KEYS.AI_CHATBOT,
      ai_exercise_suggestions: REMOTE_CONFIG_KEYS.AI_EXERCISE_SUGGESTIONS,
      ai_clinical_analysis: REMOTE_CONFIG_KEYS.AI_CLINICAL_ANALYSIS,
      ai_treatment_planning: REMOTE_CONFIG_KEYS.AI_TREATMENT_PLANNING,
      ai_patient_chat: REMOTE_CONFIG_KEYS.AI_PATIENT_CHAT,
      ai_progress_analysis: REMOTE_CONFIG_KEYS.AI_PROGRESS_ANALYSIS,
      digital_prescription: REMOTE_CONFIG_KEYS.DIGITAL_PRESCRIPTION,
      pain_map_v2: REMOTE_CONFIG_KEYS.PAIN_MAP_V2,
      soap_records_v2: REMOTE_CONFIG_KEYS.SOAP_RECORDS_V2,
      telemedicine_enabled: REMOTE_CONFIG_KEYS.TELEMEDICINE_ENABLED,
      exercise_prescription_v2: REMOTE_CONFIG_KEYS.EXERCISE_PRESCRIPTION_V2,
      advanced_analytics: REMOTE_CONFIG_KEYS.ADVANCED_ANALYTICS,
      patient_reports_v2: REMOTE_CONFIG_KEYS.PATIENT_REPORTS_V2,
      revenue_analytics: REMOTE_CONFIG_KEYS.REVENUE_ANALYTICS,
      whatsapp_notifications: REMOTE_CONFIG_KEYS.WHATSAPP_NOTIFICATIONS,
      google_calendar_sync: REMOTE_CONFIG_KEYS.GOOGLE_CALENDAR_SYNC,
      stripe_integration: REMOTE_CONFIG_KEYS.STRIPE_INTEGRATION,
      email_notifications: REMOTE_CONFIG_KEYS.EMAIL_NOTIFICATIONS,
      maintenance_mode: REMOTE_CONFIG_KEYS.MAINTENANCE_MODE,
      beta_features: REMOTE_CONFIG_KEYS.BETA_FEATURES,
      debug_mode: REMOTE_CONFIG_KEYS.DEBUG_MODE,
      new_onboarding: REMOTE_CONFIG_KEYS.NEW_ONBOARDING,
    };

    return keyMap[feature] || feature;
  }

  /**
   * Get description for feature
   */
  private getDescriptionForFeature(feature: FeatureFlagName): string {
    const descriptions: Record<FeatureFlagName, string> = {
      new_dashboard: 'Novo dashboard com interface melhorada',
      dashboard_v2: 'Dashboard v2 com widgets customizáveis',
      ai_transcription: 'Transcrição automática de consultas',
      ai_chatbot: 'Chatbot de IA para pacientes',
      ai_exercise_suggestions: 'Sugestões de exercícios por IA',
      ai_clinical_analysis: 'Análise clínica assistida por IA',
      ai_treatment_planning: 'Planejamento de tratamento com IA',
      ai_patient_chat: 'Chat de pacientes com IA',
      ai_progress_analysis: 'Análise de progresso com IA',
      digital_prescription: 'Prescrição digital de exercícios',
      pain_map_v2: 'Mapa de dor v2 interativo',
      soap_records_v2: 'Registros SOAP v2 (já migrado para Firebase)',
      telemedicine_enabled: 'Telemedicina habilitada',
      exercise_prescription_v2: 'Prescrição de exercícios v2',
      advanced_analytics: 'Analytics avançados',
      patient_reports_v2: 'Relatórios de pacientes v2',
      revenue_analytics: 'Analytics de receita',
      whatsapp_notifications: 'Notificações via WhatsApp',
      google_calendar_sync: 'Sincronização com Google Calendar',
      stripe_integration: 'Integração com Stripe',
      email_notifications: 'Notificações por email',
      maintenance_mode: 'Modo de manutenção',
      beta_features: 'Recursos beta',
      debug_mode: 'Modo de debug',
      new_onboarding: 'Novo onboarding',
    };

    return descriptions[feature] || '';
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let remoteConfigManager: RemoteConfigManager | null = null;

export function getRemoteConfigManager(
  cacheDuration?: number,
  minimumFetchInterval?: number
): RemoteConfigManager {
  if (!remoteConfigManager) {
    remoteConfigManager = new RemoteConfigManager(cacheDuration, minimumFetchInterval);
  }
  return remoteConfigManager;
}

export async function initializeRemoteConfig(
  cacheDuration?: number,
  minimumFetchInterval?: number
): Promise<void> {
  const manager = getRemoteConfigManager(cacheDuration, minimumFetchInterval);
  await manager.initialize();
}

// ============================================================================
// CONVENIENCE FUNCTIONS (API compatível com Edge Config)
// ============================================================================

/**
 * Get all feature flags (compatível com Edge Config)
 */
export async function getFeatureFlags(): Promise<Partial<Record<FeatureFlagName, boolean>>> {
  const manager = getRemoteConfigManager();
  return manager.getAllFeatures();
}

/**
 * Check if a specific feature is enabled (compatível com Edge Config)
 */
export async function isFeatureEnabled(
  feature: FeatureFlagName,
  userId?: string,
  _userRole?: string
): Promise<boolean> {
  const manager = getRemoteConfigManager();

  if (userId) {
    return manager.isFeatureEnabledForUser(feature, userId);
  }

  return manager.isFeatureEnabled(feature);
}

/**
 * Get multiple feature flags at once (compatível com Edge Config)
 */
export async function getMultipleFeatures(
  features: FeatureFlagName[],
  userId?: string,
  _userRole?: string
): Promise<Record<string, boolean>> {
  const manager = getRemoteConfigManager();

  if (userId) {
    const result: Record<string, boolean> = {};
    for (const feature of features) {
      result[feature] = manager.isFeatureEnabledForUser(feature, userId);
    }
    return result;
  }

  return manager.getMultipleFeatures(features);
}

/**
 * Get user-specific feature flags (compatível com Edge Config)
 */
export async function getUserFeatures(
  userId: string,
  userRole: string
): Promise<Partial<Record<FeatureFlagName, boolean>>> {
  const manager = getRemoteConfigManager();
  const allFeatures = manager.getAllFeatures();
  const userFlags: Partial<Record<FeatureFlagName, boolean>> = {};

  for (const [key, value] of Object.entries(allFeatures)) {
    userFlags[key as FeatureFlagName] = manager.isFeatureEnabledForUser(
      key as FeatureFlagName,
      userId
    );
  }

  return userFlags;
}

/**
 * Check if maintenance mode is active (compatível com Edge Config)
 */
export async function isMaintenanceMode(): Promise<boolean> {
  return isFeatureEnabled('maintenance_mode');
}

/**
 * A/B testing helper (compatível com Edge Config)
 */
export async function getABTestVariant(
  testName: string,
  userId: string
): Promise<string | null> {
  const manager = getRemoteConfigManager();
  const key = `ab_test_${testName}`;
  const variant = manager.getString(key);

  if (!variant) {
    // Simple 50/50 split based on user hash
    const hash = manager['hashUserId'](userId);
    return hash < 50 ? 'A' : 'B';
  }

  return variant;
}

/**
 * Refresh remote config
 */
export async function refreshRemoteConfig(): Promise<boolean> {
  const manager = getRemoteConfigManager();
  return manager.refresh();
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useEffect, useState } from 'react';

export function useRemoteConfig() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeRemoteConfig().then(() => {
      setIsInitialized(true);
      setIsLoading(false);
    });
  }, []);

  const manager = getRemoteConfigManager();

  return {
    isInitialized,
    isLoading,
    isFeatureEnabled: (feature: FeatureFlagName) => manager.isFeatureEnabled(feature),
    getFeatureConfig: (feature: FeatureFlagName) => manager.getFeatureConfig(feature),
    getAllFeatures: () => manager.getAllFeatures(),
    refresh: async () => {
      setIsLoading(true);
      const result = await manager.refresh();
      setIsLoading(false);
      return result;
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const RemoteConfigService = {
  initialize: initializeRemoteConfig,
  refresh: refreshRemoteConfig,
  isFeatureEnabled,
  getFeatureFlags,
  getMultipleFeatures,
  getUserFeatures,
  isMaintenanceMode,
  getABTestVariant,
};
