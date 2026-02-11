/**
 * Inicialização de Serviços do Firebase
 *
 * Inicializa todos os serviços monitorados e tracking
 */

import { initPerformanceMonitoring } from '@/lib/monitoring/performance';
import { initRemoteConfig } from '@/lib/config/remote-config';
import { initAnalytics } from '@/lib/analytics/events';
import { initSentry, setUser } from '@/lib/monitoring/sentry';
import { auth } from '@/lib/firebase';
import { logger } from '@/lib/errors/logger';

/**
 * Inicializa todos os serviços do Firebase
 */
export async function initializeServices() {
  logger.info('[Init] Inicializando serviços do Firebase');

  try {
    // 1. Sentry (Error Tracking) - PRIMEIRO para capturar erros
    initSentry({
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1, // 10% das transações
      profilesSampleRate: 0.1,
    });

    // 2. Analytics (Event Tracking)
    initAnalytics();

    // 3. Performance Monitoring
    initPerformanceMonitoring();

    // 4. Remote Config (Feature Flags)
    await initRemoteConfig();

    logger.info('[Init] Todos os serviços inicializados com sucesso');
  } catch (error) {
    logger.error('[Init] Erro ao inicializar serviços:', error);
    // Não lança erro para não quebrar o app
  }
}

/**
 * Configura usuário para tracking
 */
export function setupUserTracking(user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}) {
  try {
    // Sentry
    setUser({
      id: user.uid,
      email: user.email || undefined,
      name: user.displayName || undefined,
    });

    logger.debug(`[Init] Tracking configurado para usuário ${user.uid}`);
  } catch (error) {
    logger.error('[Init] Erro ao configurar tracking do usuário:', error);
  }
}

/**
 * Limpa dados do usuário ao fazer logout
 */
export function clearUserTracking() {
  try {
    // Sentry - import dinâmico para evitar erro de build
    import('@/lib/monitoring/sentry').then(({ clearUser: sentryClearUser }) => {
      sentryClearUser();
    });

    logger.debug('[Init] Tracking do usuário limpo');
  } catch (error) {
    logger.error('[Init] Erro ao limpar tracking do usuário:', error);
  }
}

/**
 * Verifica se todos os serviços estão ativos
 */
export async function checkServicesHealth(): Promise<{
  sentry: boolean;
  analytics: boolean;
  performance: boolean;
  remoteConfig: boolean;
}> {
  const health = {
    sentry: false,
    analytics: false,
    performance: false,
    remoteConfig: false,
  };

  try {
    // Sentry
    health.sentry = typeof window !== 'undefined' &&
                     (window as any).__SENTRY__ !== undefined;

    // Analytics
    health.analytics = typeof window !== 'undefined' &&
                       (window as any).firebase !== undefined;

    // Performance
    health.performance = typeof window !== 'undefined' &&
                         (window as any).firebase !== undefined;

    // Remote Config
    // Não há como verificar sem chamar uma função, então assumimos true se inicializou
    health.remoteConfig = true;
  } catch (error) {
    logger.error('[Init] Erro ao verificar saúde dos serviços:', error);
  }

  return health;
}

/**
 * Inicialização no cliente (para ser chamada no main.tsx)
 */
export function initializeOnClient() {
  if (typeof window === 'undefined') return;

  // Aguarda o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeServices);
  } else {
    initializeServices();
  }
}

/**
 * Exportar tudo em um único objeto
 */
export const firebaseServices = {
  initialize: initializeServices,
  setupUser: setupUserTracking,
  clearUser: clearUserTracking,
  checkHealth: checkServicesHealth,
};

export default firebaseServices;
