/**
 * Firebase Remote Config
 *
 * Gerencia feature flags e configurações remotas
 */

import {
  getRemoteConfig,
  fetchAndActivate,
  getValue,
  getBoolean,
  getNumber,
  getString,
  getAll,
  type RemoteConfig,
} from 'firebase/remote-config';
import { firebaseApp } from '@/integrations/firebase/client';
import { logger } from '@/lib/logging/logger';

let remoteConfigInstance: RemoteConfig | null = null;

/**
 * Inicializa o Remote Config
 */
export async function initRemoteConfig() {
  try {
    if (remoteConfigInstance) return remoteConfigInstance;

    const rc = getRemoteConfig(firebaseApp);

    // Configurações para desenvolvimento
    if (import.meta.env.DEV) {
      rc.settings.minimumFetchIntervalMillis = 60000; // 1 minuto em dev
      rc.settings.fetchTimeoutMillis = 60000;
    } else {
      rc.settings.minimumFetchIntervalMillis = 3600000; // 1 hora em produção
      rc.settings.fetchTimeoutMillis = 60000;
    }

    // Buscar e ativar configurações
    await fetchAndActivate(rc);

    remoteConfigInstance = rc;
    logger.info('[RemoteConfig] Config inicializado e ativado');
    return rc;
  } catch (error) {
    logger.error('[RemoteConfig] Erro ao inicializar:', error);
    return null;
  }
}

/**
 * Garante que o Remote Config está inicializado
 */
async function ensureInitialized(): Promise<RemoteConfig | null> {
  if (!remoteConfigInstance) {
    return await initRemoteConfig();
  }
  return remoteConfigInstance;
}

/**
 * Obtém um valor booleano do Remote Config
 */
export async function getRemoteBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
  try {
    const rc = await ensureInitialized();
    if (!rc) return defaultValue;

    return getBoolean(rc, key);
  } catch (error) {
    logger.error(`[RemoteConfig] Erro ao obter boolean "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Obtém um valor numérico do Remote Config
 */
export async function getRemoteNumber(key: string, defaultValue: number = 0): Promise<number> {
  try {
    const rc = await ensureInitialized();
    if (!rc) return defaultValue;

    return getNumber(rc, key);
  } catch (error) {
    logger.error(`[RemoteConfig] Erro ao obter número "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Obtém um valor string do Remote Config
 */
export async function getRemoteString(key: string, defaultValue: string = ''): Promise<string> {
  try {
    const rc = await ensureInitialized();
    if (!rc) return defaultValue;

    return getString(rc, key);
  } catch (error) {
    logger.error(`[RemoteConfig] Erro ao obter string "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Obtém todos os valores do Remote Config
 */
export async function getAllRemoteConfig(): Promise<Record<string, any>> {
  try {
    const rc = await ensureInitialized();
    if (!rc) return {};

    const all = getAll(rc);
    const result: Record<string, any> = {};

    Object.entries(all).forEach(([key, value]) => {
      if (value.asSource() === 'remote') {
        result[key] = value.asString();
      }
    });

    return result;
  } catch (error) {
    logger.error('[RemoteConfig] Erro ao obter todos os valores:', error);
    return {};
  }
}

/**
 * Feature flags específicas do FisioFlow
 */
export const featureFlags = {
  /**
   * Verifica se features de IA estão habilitadas
   */
  isAIEnabled: async () => {
    return await getRemoteBoolean('ai_features_enabled', true);
  },

  /**
   * Verifica se a busca semântica está habilitada
   */
  isSemanticSearchEnabled: async () => {
    return await getRemoteBoolean('semantic_search_enabled', false);
  },

  /**
   * Verifica se o RAG para sugestões clínicas está habilitado
   */
  isRAGEabled: async () => {
    return await getRemoteBoolean('rag_enabled', false);
  },

  /**
   * Verifica se a telemedicina está habilitada
   */
  isTelemedicineEnabled: async () => {
    return await getRemoteBoolean('telemedicine_enabled', false);
  },

  /**
   * Verifica se a gamificação está habilitada
   */
  isGamificationEnabled: async () => {
    return await getRemoteBoolean('gamification_enabled', true);
  },

  /**
   * Verifica se o app está em modo de manutenção
   */
  isMaintenanceMode: async () => {
    return await getRemoteBoolean('maintenance_mode', false);
  },

  /**
   * Obtém o número máximo de agendamentos diários
   */
  getMaxDailyAppointments: async () => {
    return await getRemoteNumber('max_daily_appointments', 50);
  },

  /**
   * Obtém a cor primária da marca
   */
  getBrandPrimaryColor: async () => {
    return await getRemoteString('brand_primary_color', '#3b82f6');
  },

  /**
   * Verifica se o debug logging está habilitado
   */
  isDebugLoggingEnabled: async () => {
    return await getRemoteBoolean('debug_logging_enabled', import.meta.env.DEV);
  },

  /**
   * Obtém a variante de onboarding (para A/B testing)
   */
  getOnboardingVariant: async () => {
    return await getRemoteString('onboarding_variant', 'v1');
  },

  /**
   * Verifica se sugestões de IA devem ser mostradas
   */
  showAISuggestions: async () => {
    const aiEnabled = await featureFlags.isAIEnabled();
    const showSuggestions = await getRemoteBoolean('ai_show_suggestions', true);
    return aiEnabled && showSuggestions;
  },
};

/**
 * Hook React para usar Remote Config
 */
export function useRemoteConfig() {
  const [config, setConfig] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      const all = await getAllRemoteConfig();
      setConfig(all);
      setLoading(false);
    }

    loadConfig();
  }, []);

  return { config, loading };
}

import React from 'react';
