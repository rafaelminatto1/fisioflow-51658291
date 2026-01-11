/**
 * Feature Flags via Environment Variables
 *
 * ALTERNATIVA ao Edge Config caso não esteja disponível no seu plano
 *
 * Use variáveis de ambiente instead of Edge Config
 */

// Tipos para as features
export interface FeatureFlags {
  new_dashboard: boolean;
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

const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

/**
 * Obter feature flags via environment variables
 * Fallback caso Edge Config não esteja disponível
 */
export function getFeatureFlagsFromEnv(): Partial<FeatureFlags> {
  return {
    // Dashboard
    new_dashboard: getEnv('VITE_FEATURE_NEW_DASHBOARD') === 'true',

    // AI Features
    ai_transcription: getEnv('VITE_FEATURE_AI_TRANSCRIPTION') !== 'false', // default true
    ai_chatbot: getEnv('VITE_FEATURE_AI_CHATBOT') !== 'false', // default true
    ai_exercise_suggestions: getEnv('VITE_FEATURE_AI_EXERCISE_SUGGESTIONS') !== 'false', // default true

    // Clinical Features
    digital_prescription: getEnv('VITE_FEATURE_DIGITAL_PRESCRIPTION') !== 'false', // default true
    pain_map_v2: getEnv('VITE_FEATURE_PAIN_MAP_V2') === 'true',
    soap_records_v2: getEnv('VITE_FEATURE_SOAP_RECORDS_V2') === 'true',

    // Analytics
    advanced_analytics: getEnv('VITE_FEATURE_ADVANCED_ANALYTICS') !== 'false', // default true
    patient_reports_v2: getEnv('VITE_FEATURE_PATIENT_REPORTS_V2') === 'true',

    // Integration
    whatsapp_notifications: getEnv('VITE_FEATURE_WHATSAPP_NOTIFICATIONS') !== 'false', // default true
    google_calendar_sync: getEnv('VITE_FEATURE_GOOGLE_CALENDAR_SYNC') !== 'false', // default true

    // System
    maintenance_mode: getEnv('VITE_FEATURE_MAINTENANCE_MODE') === 'true',
    beta_features: getEnv('VITE_FEATURE_BETA_FEATURES') === 'true',
  };
}

/**
 * Verificar se uma feature específica está habilitada
 * Via environment variables (fallback)
 */
export function isFeatureEnabledFromEnv(
  feature: keyof FeatureFlags,
  userId?: string,
  userRole?: string
): boolean {
  const flags = getFeatureFlagsFromEnv();
  const enabled = flags[feature];

  // Verificar maintenance mode primeiro
  if (feature !== 'maintenance_mode' && flags.maintenance_mode) {
    return false;
  }

  // Lógica de roles (pode ser expandida)
  if (enabled && userRole === 'admin') {
    // Admins têm acesso a features beta
    if (flags.beta_features) {
      return true;
    }
  }

  return enabled || false;
}

/**
 * Hook React para feature flags via environment variables
 */
export function useFeatureFlag(feature: keyof FeatureFlags) {
  const enabled = isFeatureEnabledFromEnv(feature);

  return {
    enabled,
    isLoading: false,
    error: null,
  };
}

/**
 * Obter múltiplas features de uma vez
 */
export function getMultipleFeaturesFromEnv(
  features: (keyof FeatureFlags)[]
): Record<string, boolean> {
  const flags = getFeatureFlagsFromEnv();
  const result: Record<string, boolean> = {};

  for (const feature of features) {
    result[feature] = isFeatureEnabledFromEnv(feature);
  }

  return result;
}

/**
 * Helper para mostrar/hide componentes baseado em features
 */
export function showFeature(feature: keyof FeatureFlags): boolean {
  return isFeatureEnabledFromEnv(feature);
}

// Uso em componentes React:
/*
import { showFeature } from '@/lib/featureFlags/envFlags';

function MyComponent() {
  if (!showFeature('new_dashboard')) {
    return <OldDashboard />;
  }

  return <NewDashboard />;
}
*/
