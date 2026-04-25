/**
 * Hook para preload inteligente de rotas mais acessadas
 * Usa requestIdleCallback para não bloquear a UI
 */

import { useEffect, useCallback } from "react";
import { APP_ROUTES } from "@/lib/routing/appRoutes";

// Mapa de componentes para prefetch manual
// Usamos a função de import que o React.lazy usa internamente
const routeImports: Record<string, () => Promise<unknown>> = {
  // Core pages
  [APP_ROUTES.AGENDA]: () => import("@/pages/Schedule"),
  [APP_ROUTES.PATIENTS]: () => import("@/pages/Patients"),
  [APP_ROUTES.EXERCISES]: () => import("@/pages/Exercises"),
  [APP_ROUTES.EVENTS]: () => import("@/pages/Eventos"),
  [APP_ROUTES.TASKS]: () => import("@/pages/TarefasV2"),
  [APP_ROUTES.FINANCIAL]: () => import("@/pages/Financial"),
  [APP_ROUTES.REPORTS]: () => import("@/pages/Reports"),
  [APP_ROUTES.SETTINGS]: () => import("@/pages/Profile").then((m) => ({ default: m.Profile })),

  // IA & Inteligência
  "/inteligencia": () => import("@/pages/IntelligenceHub"),

  // Biomecânica submenu
  "/biomechanics": () => import("@/pages/clinical/BiomechanicsAnalysisPage"),
  "/clinical/biomechanics/posture": () => import("@/pages/clinical/BiomechanicsAnalysisPage"),
  "/clinical/biomechanics/gait": () => import("@/pages/clinical/BiomechanicsAnalysisPage"),
  "/clinical/biomechanics/jump": () => import("@/pages/clinical/BiomechanicsAnalysisPage"),
  "/clinical/biomechanics/functional": () => import("@/pages/clinical/BiomechanicsAnalysisPage"),

  // Financeiro submenu
  "/financeiro/recibos": () => import("@/pages/financeiro/RecibosPage"),
  "/financeiro/simulador": () => import("@/pages/financeiro/SimuladorReceitasPage"),
  "/financeiro/comissoes": () =>
    import("@/components/financial/CommissionsDashboard").then((m) => ({
      default: m.CommissionsDashboard,
    })),
  "/financeiro/demonstrativo": () => import("@/pages/financeiro/DemonstrativoMensalPage"),

  // Configurações submenu
  "/configuracoes/calendario": () =>
    import("@/pages/Profile").then((m) => ({ default: m.Profile })),
  "/integrations": () => import("@/pages/Integrations"),

  // Admin submenu
  "/admin/analytics": () => import("@/pages/Admin"),
  "/admin/security": () => import("@/pages/SecurityMonitoring"),
  "/admin/audit-logs": () => import("@/pages/AuditLogs"),

  // Operacional
  "/wiki": () => import("@/pages/Wiki"),
  "/inventory": () => import("@/pages/Inventory"),
  "/telemedicine": () => import("@/pages/Telemedicine"),
  "/communications": () => import("@/pages/Communications"),
};

export const useIntelligentPreload = () => {
  useEffect(() => {
    const preloadRoutes = () => {
      if ("requestIdleCallback" in window) {
        // First idle: load the 3 most visited pages
        requestIdleCallback(() => {
          [APP_ROUTES.AGENDA, APP_ROUTES.PATIENTS, APP_ROUTES.EXERCISES].forEach((route) =>
            routeImports[route]?.().catch(() => {}),
          );
        });
        // Second idle: load secondary pages
        requestIdleCallback(
          () => {
            [APP_ROUTES.FINANCIAL, "/inteligencia", "/communications"].forEach((route) =>
              routeImports[route]?.().catch(() => {}),
            );
          },
          { timeout: 5000 },
        );
      }
    };

    // Preload após 3 segundos (usuário já estabilizou na página)
    const timer = setTimeout(preloadRoutes, 3000);

    return () => clearTimeout(timer);
  }, []);
};

/**
 * Hook para preload de navegação
 * Usado no Sidebar para fazer prefetch de rotas ao passar o mouse
 */
export const useNavPreload = () => {
  const preloadRoute = useCallback((route: string) => {
    // Normalizar a rota (remover query params se necessário)
    const baseRoute = route.split("?")[0];
    const importFn = routeImports[baseRoute];

    if (importFn) {
      // Dispara o import dinâmico que o Vite/Webpack irá cachear
      importFn().catch(() => {});
    }
  }, []);

  return { preloadRoute };
};
