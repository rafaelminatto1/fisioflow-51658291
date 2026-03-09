import { useEffect, useMemo, useState } from 'react';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number;
  allowedUsers?: string[];
  allowedRoles?: string[];
  description?: string;
}

export type FeatureFlagName =
  | 'new_dashboard'
  | 'dashboard_v2'
  | 'ai_transcription'
  | 'ai_chatbot'
  | 'ai_exercise_suggestions'
  | 'ai_clinical_analysis'
  | 'ai_treatment_planning'
  | 'ai_patient_chat'
  | 'ai_progress_analysis'
  | 'digital_prescription'
  | 'pain_map_v2'
  | 'soap_records_v2'
  | 'telemedicine_enabled'
  | 'exercise_prescription_v2'
  | 'advanced_analytics'
  | 'patient_reports_v2'
  | 'revenue_analytics'
  | 'whatsapp_notifications'
  | 'google_calendar_sync'
  | 'stripe_integration'
  | 'email_notifications'
  | 'maintenance_mode'
  | 'beta_features'
  | 'debug_mode'
  | 'new_onboarding';

export const REMOTE_CONFIG_KEYS = {
  NEW_DASHBOARD: 'new_dashboard',
  DASHBOARD_V2: 'dashboard_v2',
  AI_ENABLED: 'ai_enabled',
  AI_TRANSCRIPTION: 'ai_transcription',
  AI_CHATBOT: 'ai_chatbot',
  AI_EXERCISE_SUGGESTIONS: 'ai_exercise_suggestions',
  AI_CLINICAL_ANALYSIS: 'ai_clinical_analysis',
  AI_TREATMENT_PLANNING: 'ai_treatment_planning',
  AI_PATIENT_CHAT: 'ai_patient_chat',
  AI_PROGRESS_ANALYSIS: 'ai_progress_analysis',
  AI_DEFAULT_MODEL: 'ai_default_model',
  AI_CLINICAL_MODEL: 'ai_clinical_model',
  AI_EXERCISE_MODEL: 'ai_exercise_model',
  AI_TREATMENT_MODEL: 'ai_treatment_model',
  AI_CHAT_MODEL: 'ai_chat_model',
  AI_ANALYSIS_MODEL: 'ai_analysis_model',
  AI_QUICK_MODEL: 'ai_quick_model',
  AI_MAX_REQUESTS_PER_HOUR: 'ai_max_requests_per_hour',
  AI_MAX_REQUESTS_PER_DAY: 'ai_max_requests_per_day',
  AI_MAX_TOKENS_PER_REQUEST: 'ai_max_tokens_per_request',
  AI_DAILY_BUDGET_LIMIT: 'ai_daily_budget_limit',
  AI_MONTHLY_BUDGET_LIMIT: 'ai_monthly_budget_limit',
  AI_MIN_TEMPERATURE: 'ai_min_temperature',
  AI_MAX_TEMPERATURE: 'ai_max_temperature',
  AI_DEFAULT_MAX_TOKENS: 'ai_default_max_tokens',
  AI_ENABLE_STREAMING: 'ai_enable_streaming',
  AI_ENABLE_FUNCTION_CALLING: 'ai_enable_function_calling',
  AI_ENABLE_MULTIMODAL: 'ai_enable_multimodal',
  AI_TIMEOUT_MS: 'ai_timeout_ms',
  DIGITAL_PRESCRIPTION: 'digital_prescription',
  PAIN_MAP_V2: 'pain_map_v2',
  SOAP_RECORDS_V2: 'soap_records_v2',
  TELEMEDICINE_ENABLED: 'telemedicine_enabled',
  EXERCISE_PRESCRIPTION_V2: 'exercise_prescription_v2',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  PATIENT_REPORTS_V2: 'patient_reports_v2',
  REVENUE_ANALYTICS: 'revenue_analytics',
  WHATSAPP_NOTIFICATIONS: 'whatsapp_notifications',
  GOOGLE_CALENDAR_SYNC: 'google_calendar_sync',
  STRIPE_INTEGRATION: 'stripe_integration',
  EMAIL_NOTIFICATIONS: 'email_notifications',
  MAINTENANCE_MODE: 'maintenance_mode',
  BETA_FEATURES: 'beta_features',
  DEBUG_MODE: 'debug_mode',
  NEW_ONBOARDING: 'new_onboarding',
} as const;

export const REMOTE_CONFIG_DEFAULTS: Record<string, string | number | boolean> = {
  [REMOTE_CONFIG_KEYS.NEW_DASHBOARD]: false,
  [REMOTE_CONFIG_KEYS.DASHBOARD_V2]: false,
  [REMOTE_CONFIG_KEYS.AI_ENABLED]: true,
  [REMOTE_CONFIG_KEYS.AI_TRANSCRIPTION]: true,
  [REMOTE_CONFIG_KEYS.AI_CHATBOT]: true,
  [REMOTE_CONFIG_KEYS.AI_EXERCISE_SUGGESTIONS]: true,
  [REMOTE_CONFIG_KEYS.AI_CLINICAL_ANALYSIS]: true,
  [REMOTE_CONFIG_KEYS.AI_TREATMENT_PLANNING]: true,
  [REMOTE_CONFIG_KEYS.AI_PATIENT_CHAT]: true,
  [REMOTE_CONFIG_KEYS.AI_PROGRESS_ANALYSIS]: true,
  [REMOTE_CONFIG_KEYS.AI_DEFAULT_MODEL]: 'gemini-2.5-flash',
  [REMOTE_CONFIG_KEYS.AI_CLINICAL_MODEL]: 'gemini-2.5-pro',
  [REMOTE_CONFIG_KEYS.AI_EXERCISE_MODEL]: 'gemini-2.5-flash',
  [REMOTE_CONFIG_KEYS.AI_TREATMENT_MODEL]: 'gemini-2.5-pro',
  [REMOTE_CONFIG_KEYS.AI_CHAT_MODEL]: 'gemini-2.5-flash-lite',
  [REMOTE_CONFIG_KEYS.AI_ANALYSIS_MODEL]: 'gemini-2.5-flash',
  [REMOTE_CONFIG_KEYS.AI_QUICK_MODEL]: 'gemini-2.5-flash-lite',
  [REMOTE_CONFIG_KEYS.AI_MAX_REQUESTS_PER_HOUR]: 100,
  [REMOTE_CONFIG_KEYS.AI_MAX_REQUESTS_PER_DAY]: 1000,
  [REMOTE_CONFIG_KEYS.AI_MAX_TOKENS_PER_REQUEST]: 8192,
  [REMOTE_CONFIG_KEYS.AI_DAILY_BUDGET_LIMIT]: 50,
  [REMOTE_CONFIG_KEYS.AI_MONTHLY_BUDGET_LIMIT]: 1000,
  [REMOTE_CONFIG_KEYS.AI_MIN_TEMPERATURE]: 0.1,
  [REMOTE_CONFIG_KEYS.AI_MAX_TEMPERATURE]: 1,
  [REMOTE_CONFIG_KEYS.AI_DEFAULT_MAX_TOKENS]: 2048,
  [REMOTE_CONFIG_KEYS.AI_ENABLE_STREAMING]: true,
  [REMOTE_CONFIG_KEYS.AI_ENABLE_FUNCTION_CALLING]: true,
  [REMOTE_CONFIG_KEYS.AI_ENABLE_MULTIMODAL]: true,
  [REMOTE_CONFIG_KEYS.AI_TIMEOUT_MS]: 30000,
  [REMOTE_CONFIG_KEYS.DIGITAL_PRESCRIPTION]: true,
  [REMOTE_CONFIG_KEYS.PAIN_MAP_V2]: false,
  [REMOTE_CONFIG_KEYS.SOAP_RECORDS_V2]: true,
  [REMOTE_CONFIG_KEYS.TELEMEDICINE_ENABLED]: true,
  [REMOTE_CONFIG_KEYS.EXERCISE_PRESCRIPTION_V2]: true,
  [REMOTE_CONFIG_KEYS.ADVANCED_ANALYTICS]: true,
  [REMOTE_CONFIG_KEYS.PATIENT_REPORTS_V2]: false,
  [REMOTE_CONFIG_KEYS.REVENUE_ANALYTICS]: true,
  [REMOTE_CONFIG_KEYS.WHATSAPP_NOTIFICATIONS]: true,
  [REMOTE_CONFIG_KEYS.GOOGLE_CALENDAR_SYNC]: true,
  [REMOTE_CONFIG_KEYS.STRIPE_INTEGRATION]: true,
  [REMOTE_CONFIG_KEYS.EMAIL_NOTIFICATIONS]: true,
  [REMOTE_CONFIG_KEYS.MAINTENANCE_MODE]: false,
  [REMOTE_CONFIG_KEYS.BETA_FEATURES]: false,
  [REMOTE_CONFIG_KEYS.DEBUG_MODE]: false,
  [REMOTE_CONFIG_KEYS.NEW_ONBOARDING]: false,
};

class RemoteConfigService {
  async initialize() {
    logger.info('Remote config initialized via env/localStorage', undefined, 'remote-config');
    return true;
  }

  async refresh() {
    return this.initialize();
  }

  getValue(key: string) {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(`remote-config:${key}`);
      if (stored != null) return stored;
    }
    return REMOTE_CONFIG_DEFAULTS[key];
  }

  async isFeatureEnabled(feature: FeatureFlagName) {
    const value = this.getValue(feature);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    if (typeof value === 'number') return value > 0;
    return false;
  }
}

const manager = new RemoteConfigService();

export async function initializeRemoteConfig() {
  return manager.initialize();
}

export function getRemoteConfigManager() {
  return manager;
}

export async function getFeatureFlags() {
  return { ...REMOTE_CONFIG_DEFAULTS };
}

export async function isFeatureEnabled(feature: FeatureFlagName) {
  return manager.isFeatureEnabled(feature);
}

export async function getMultipleFeatures(features: FeatureFlagName[]) {
  const entries = await Promise.all(features.map(async (feature) => [feature, await manager.isFeatureEnabled(feature)] as const));
  return Object.fromEntries(entries);
}

export async function getUserFeatures(_userId?: string, _userRole?: string) {
  return getFeatureFlags();
}

export async function isMaintenanceMode() {
  return manager.isFeatureEnabled('maintenance_mode');
}

export function getABTestVariant(_testName: string, variants: string[] = ['control']) {
  return variants[0] ?? 'control';
}

export async function refreshRemoteConfig() {
  return manager.refresh();
}

export function useRemoteConfig() {
  const [flags, setFlags] = useState<Record<string, string | number | boolean>>(REMOTE_CONFIG_DEFAULTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    void getFeatureFlags().then((result) => {
      setFlags(result);
      setLoading(false);
    });
  }, []);

  return useMemo(() => ({
    loading,
    flags,
    getFeatureFlag: (feature: FeatureFlagName) => Boolean(flags[feature]),
    isFeatureEnabled: (feature: FeatureFlagName) => Boolean(flags[feature]),
    refresh: refreshRemoteConfig,
  }), [flags, loading]);
}

export { RemoteConfigService };
