/**
 * Hook para preload inteligente de rotas mais acessadas
 * Usa requestIdleCallback para não bloquear a UI
 */

import { useEffect, useCallback } from "react";
import { APP_ROUTES } from "@/lib/routing/appRoutes";

// Mapa de componentes para prefetch manual
// Usamos a função de import que o React.lazy usa internamente
const routeImports: Record<string, () => Promise<unknown>> = {
	[APP_ROUTES.AGENDA]: () => import("@/pages/Schedule"),
	[APP_ROUTES.PATIENTS]: () => import("@/pages/Patients"),
	[APP_ROUTES.EXERCISES]: () => import("@/pages/Exercises"),
	[APP_ROUTES.EVENTS]: () => import("@/pages/Eventos"),
	[APP_ROUTES.TASKS]: () => import("@/pages/TarefasV2"),
	[APP_ROUTES.FINANCIAL]: () => import("@/pages/Financial"),
	[APP_ROUTES.REPORTS]: () => import("@/pages/Reports"),
	[APP_ROUTES.SETTINGS]: () => import("@/pages/Settings"),
};

export const useIntelligentPreload = () => {
	useEffect(() => {
		const preloadRoutes = () => {
			if ("requestIdleCallback" in window) {
				requestIdleCallback(() => {
					// Preload apenas das 3 mais prováveis inicialmente
					[APP_ROUTES.AGENDA, APP_ROUTES.PATIENTS, APP_ROUTES.DASHBOARD].forEach((route) => {
						const importFn = routeImports[route];
						if (importFn) {
							importFn().catch(() => {}); // Preload silancioso
						}
					});
				});
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
