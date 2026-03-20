/**
 * Hook para preload inteligente de rotas mais acessadas
 * Usa requestIdleCallback para não bloquear a UI
 */

import { useEffect, useCallback } from "react";

// Mapa de componentes para prefetch manual
// Usamos a função de import que o React.lazy usa internamente
const routeImports: Record<string, () => Promise<unknown>> = {
	"/agenda": () => import("@/pages/Schedule"),
	"/patients": () => import("@/pages/Patients"),
	"/exercises": () => import("@/pages/Exercises"),
	"/eventos": () => import("@/pages/Eventos"),
	"/tarefas": () => import("@/pages/TarefasV2"),
	"/financial": () => import("@/pages/Financial"),
	"/reports": () => import("@/pages/Reports"),
	"/settings": () => import("@/pages/Settings"),
};

export const useIntelligentPreload = () => {
	useEffect(() => {
		const preloadRoutes = () => {
			if ("requestIdleCallback" in window) {
				requestIdleCallback(() => {
					// Preload apenas das 3 mais prováveis inicialmente
					["/agenda", "/patients", "/dashboard"].forEach((route) => {
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
