import { useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { preloadComponent } from '@/utils/lazyComponents';

// Mapeamento de rotas para componentes lazy
const ROUTE_COMPONENT_MAP = {
  '/analytics': 'LazyAnalyticsDashboard',
  '/reports': 'LazyReportsLibrary',
  '/smart-ai': 'LazySmartAI',
  '/smart-plans': 'LazySmartExercisePlans',
  '/communications': 'LazyCommunications',
  '/partner': 'LazyPartner',
  '/vouchers': 'LazyVouchers',
  '/file-upload-test': 'LazyFileUploadTest'
} as const;

// Padrões de navegação comuns
const NAVIGATION_PATTERNS = {
  // Após login, usuários frequentemente vão para dashboard -> pacientes
  '/': ['/patients', '/schedule'],
  '/patients': ['/patients/new', '/schedule', '/analytics'],
  '/schedule': ['/patients', '/exercises'],
  '/exercises': ['/smart-plans', '/smart-ai'],
  '/financial': ['/reports', '/analytics'],
  '/settings': ['/profile']
} as const;

interface PreloadStats {
  route: string;
  timestamp: number;
  preloaded: boolean;
}

export function useIntelligentPreload() {
  const location = useLocation();
  const navigate = useNavigate();
  const preloadedRoutes = useRef<Set<string>>(new Set());
  const navigationHistory = useRef<PreloadStats[]>([]);
  const preloadTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Limpar timeouts ao desmontar
  useEffect(() => {
    return () => {
      preloadTimeouts.current.forEach(timeout => clearTimeout(timeout));
      preloadTimeouts.current.clear();
    };
  }, []);

  // Preload baseado em padrões de navegação
  const preloadByPattern = useCallback((currentRoute: string) => {
    const suggestedRoutes = NAVIGATION_PATTERNS[currentRoute as keyof typeof NAVIGATION_PATTERNS];
    
    if (suggestedRoutes) {
      suggestedRoutes.forEach(route => {
        if (!preloadedRoutes.current.has(route)) {
          const componentName = ROUTE_COMPONENT_MAP[route as keyof typeof ROUTE_COMPONENT_MAP];
          if (componentName) {
            // Delay de 2 segundos para não interferir no carregamento inicial
            const timeout = setTimeout(() => {
              preloadComponent(componentName);
              preloadedRoutes.current.add(route);
              
              navigationHistory.current.push({
                route,
                timestamp: Date.now(),
                preloaded: true
              });
            }, 2000);
            
            preloadTimeouts.current.set(route, timeout);
          }
        }
      });
    }
  }, []);

  // Preload baseado em hover em links
  const preloadOnHover = useCallback((route: string) => {
    if (!preloadedRoutes.current.has(route)) {
      const componentName = ROUTE_COMPONENT_MAP[route as keyof typeof ROUTE_COMPONENT_MAP];
      if (componentName) {
        // Preload imediato no hover
        preloadComponent(componentName);
        preloadedRoutes.current.add(route);
        
        navigationHistory.current.push({
          route,
          timestamp: Date.now(),
          preloaded: true
        });
      }
    }
  }, []);

  // Preload baseado em tempo de permanência na página
  const preloadByDwellTime = useCallback((currentRoute: string) => {
    // Se o usuário fica mais de 5 segundos na página, preload rotas relacionadas
    const timeout = setTimeout(() => {
      preloadByPattern(currentRoute);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [preloadByPattern]);

  // Preload baseado em análise de uso
  const preloadByUsageAnalysis = useCallback(() => {
    // Analisar histórico de navegação dos últimos 10 minutos
    const recentHistory = navigationHistory.current.filter(
      stat => Date.now() - stat.timestamp < 10 * 60 * 1000
    );

    // Encontrar rotas mais acessadas
    const routeFrequency = recentHistory.reduce((acc, stat) => {
      acc[stat.route] = (acc[stat.route] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Preload das 3 rotas mais frequentes que ainda não foram preloaded
    Object.entries(routeFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .forEach(([route]) => {
        if (!preloadedRoutes.current.has(route)) {
          const componentName = ROUTE_COMPONENT_MAP[route as keyof typeof ROUTE_COMPONENT_MAP];
          if (componentName) {
            preloadComponent(componentName);
            preloadedRoutes.current.add(route);
          }
        }
      });
  }, []);

  // Preload durante idle time
  const preloadDuringIdle = useCallback(() => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        // Preload componentes que ainda não foram carregados
        Object.entries(ROUTE_COMPONENT_MAP).forEach(([route, componentName]) => {
          if (!preloadedRoutes.current.has(route)) {
            preloadComponent(componentName);
            preloadedRoutes.current.add(route);
          }
        });
      }, { timeout: 10000 }); // Timeout de 10 segundos
    }
  }, []);

  // Efeito principal - executar preload baseado na rota atual
  useEffect(() => {
    const currentRoute = location.pathname;
    
    // Registrar navegação
    navigationHistory.current.push({
      route: currentRoute,
      timestamp: Date.now(),
      preloaded: false
    });

    // Limitar histórico a 100 entradas
    if (navigationHistory.current.length > 100) {
      navigationHistory.current = navigationHistory.current.slice(-50);
    }

    // Executar diferentes estratégias de preload
    const cleanupDwellTime = preloadByDwellTime(currentRoute);
    
    // Preload baseado em padrões (com delay)
    setTimeout(() => preloadByPattern(currentRoute), 1000);
    
    // Análise de uso (com delay maior)
    setTimeout(() => preloadByUsageAnalysis(), 3000);
    
    // Preload durante idle time
    setTimeout(() => preloadDuringIdle(), 5000);

    return cleanupDwellTime;
  }, [location.pathname, preloadByPattern, preloadByDwellTime, preloadByUsageAnalysis, preloadDuringIdle]);

  // Função para preload manual
  const manualPreload = useCallback((route: string) => {
    const componentName = ROUTE_COMPONENT_MAP[route as keyof typeof ROUTE_COMPONENT_MAP];
    if (componentName && !preloadedRoutes.current.has(route)) {
      preloadComponent(componentName);
      preloadedRoutes.current.add(route);
      return true;
    }
    return false;
  }, []);

  // Função para obter estatísticas de preload
  const getPreloadStats = useCallback(() => {
    return {
      preloadedRoutes: Array.from(preloadedRoutes.current),
      navigationHistory: navigationHistory.current.slice(-20), // Últimas 20 navegações
      totalPreloaded: preloadedRoutes.current.size,
      totalRoutes: Object.keys(ROUTE_COMPONENT_MAP).length
    };
  }, []);

  return {
    preloadOnHover,
    manualPreload,
    getPreloadStats,
    isPreloaded: (route: string) => preloadedRoutes.current.has(route)
  };
}

// Hook para usar em componentes de navegação
export function useNavPreload() {
  const { preloadOnHover, isPreloaded } = useIntelligentPreload();

  const handleLinkHover = useCallback((route: string) => {
    preloadOnHover(route);
  }, [preloadOnHover]);

  const getLinkProps = useCallback((route: string) => {
    return {
      onMouseEnter: () => handleLinkHover(route),
      'data-preloaded': isPreloaded(route)
    };
  }, [handleLinkHover, isPreloaded]);

  return {
    handleLinkHover,
    getLinkProps,
    isPreloaded
  };
}