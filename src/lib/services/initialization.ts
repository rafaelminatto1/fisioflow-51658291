/**
 * Inicialização de serviços de plataforma
 *
 * Inicializa monitoramento, analytics e feature flags.
 */

import { logger } from "@/lib/errors/logger";

// Os módulos de monitoramento (Sentry/replay ~317KB, performance, analytics,
// remote-config) são importados DINAMICAMENTE dentro das funções abaixo, e não
// no topo. Motivo: este arquivo é importado eagerly pelo AuthContextProvider
// (setup/clearUserTracking), então um import estático arrastaria o @sentry/react
// inteiro para o bundle inicial da /agenda. Como a inicialização já roda após o
// primeiro render (setTimeout no main.tsx), o import dinâmico não atrasa nada e
// tira ~317KB do carregamento inicial. O ESM cacheia o módulo, então chamadas
// seguintes (setUser no login) reaproveitam sem novo download.

/**
 * Inicializa todos os serviços de plataforma
 */
export async function initializeServices() {
  logger.info("[Init] Inicializando serviços de plataforma");

  try {
    const [{ initSentry }, { initAnalytics }, { initPerformanceMonitoring }, { initRemoteConfig }] =
      await Promise.all([
        import("@/lib/monitoring/sentry"),
        import("@/lib/analytics/events"),
        import("@/lib/monitoring/performance"),
        import("@/lib/config/remote-config"),
      ]);

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

    logger.info("[Init] Todos os serviços inicializados com sucesso");
  } catch (error) {
    logger.error("[Init] Erro ao inicializar serviços:", error);
    // Não lança erro para não quebrar o app
  }
}

/**
 * Configura usuário para tracking
 */
export async function setupUserTracking(user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}) {
  try {
    const { setUser } = await import("@/lib/monitoring/sentry");
    setUser({
      id: user.uid,
      email: user.email || undefined,
      name: user.displayName || undefined,
    });

    logger.debug(`[Init] Tracking configurado para usuário ${user.uid}`);
  } catch (error) {
    logger.error("[Init] Erro ao configurar tracking do usuário:", error);
  }
}

/**
 * Limpa dados do usuário ao fazer logout
 */
export async function clearUserTracking() {
  try {
    const { clearUser: clearSentryUser } = await import("@/lib/monitoring/sentry");
    clearSentryUser();

    logger.debug("[Init] Tracking do usuário limpo");
  } catch (error) {
    logger.error("[Init] Erro ao limpar tracking do usuário:", error);
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
    health.sentry = typeof window !== "undefined" && (window as any).__SENTRY__ !== undefined;

    // Analytics
    health.analytics = typeof window !== "undefined" && (window as any).gtag !== undefined;

    // Performance
    health.performance = typeof window !== "undefined" && "performance" in window;

    // Remote Config
    // Não há como verificar sem chamar uma função, então assumimos true se inicializou
    health.remoteConfig = true;
  } catch (error) {
    logger.error("[Init] Erro ao verificar saúde dos serviços:", error);
  }

  return health;
}

/**
 * Inicialização no cliente (para ser chamada no main.tsx)
 */
export async function initializeOnClient(): Promise<void> {
  if (typeof window === "undefined") return;

  // Aguarda o DOM estar pronto
  if (document.readyState === "loading") {
    await new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => {
        initializeServices().then(() => resolve());
      });
    });
  } else {
    await initializeServices();
  }
}

/**
 * Exportar tudo em um único objeto
 */
export const platformServices = {
  initialize: initializeServices,
  setupUser: setupUserTracking,
  clearUser: clearUserTracking,
  checkHealth: checkServicesHealth,
};

export default platformServices;
