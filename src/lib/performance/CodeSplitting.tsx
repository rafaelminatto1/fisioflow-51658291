/**
 * CodeSplitting - Utilitários para code splitting e lazy loading
 *
 * Performance: Divide a aplicação em chunks carregados sob demanda
 * - React.lazy para componentes
 * - Suspense com fallback otimizado
 * - Preloading estratégico
 * - Route-based splitting
 * - Error boundaries para falhas de carregamento
 */

import React, {
  lazy,
  Suspense,
  ComponentType,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TIPOS
// ============================================================================

export type LazyComponentProps = {
  fallback?: ReactNode;
  delay?: number; // Delay antes de mostrar fallback
  minDisplayTime?: number; // Tempo mínimo de display do fallback
};

export type PreloadTrigger = 'hover' | 'viewport' | 'immediate' | 'focus' | 'click';

// ============================================================================
// COMPONENTES LAZY COM FALLBACK OTIMIZADO
// ============================================================================

interface LazyWrapperProps extends LazyComponentProps {
  children: ReactNode;
}

/**
 * LazyWrapper - Wrapper com fallback atrasado
 */
export const LazyWrapper = ({
  children,
  fallback = <DefaultFallback />,
  delay = 200,
  minDisplayTime = 500,
}: LazyWrapperProps) => {
  const [showFallback, setShowFallback] = useState(false);
  const [showContent, setShowContent] = useState(!!children);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let minTimeoutId: ReturnType<typeof setTimeout>;

    if (!children) {
      timeoutId = setTimeout(() => {
        setShowFallback(true);
      }, delay);

      minTimeoutId = setTimeout(() => {
        setShowContent(false);
      }, minDisplayTime);
    } else {
      setShowFallback(false);
      setShowContent(true);
    }

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(minTimeoutId);
    };
  }, [children, delay, minDisplayTime]);

  return <>{showContent ? children : showFallback ? fallback : null}</>;
};

const DefaultFallback = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex items-center justify-center p-8"
  >
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
      <span className="text-sm text-muted-foreground">Carregando...</span>
    </div>
  </motion.div>
);

// ============================================================================
// LAZY LOADING COM PRELOAD
// ============================================================================

interface LazyLoadOptions<T> {
  importFn: () => Promise<{ default: ComponentType<T> }>;
  preloadTrigger?: PreloadTrigger;
  fallback?: ReactNode;
  displayName?: string;
}

/**
 * createLazyComponent - Cria componente lazy com preload configurável
 */
export function createLazyComponent<T = {}>(
  options: LazyLoadOptions<T>
): ComponentType<T> & { preload: () => void } {
  const { importFn, preloadTrigger = 'viewport', fallback, displayName } = options;

  const LazyComponent = lazy(importFn);

  const ComponentWithPreload = (props: T) => (
    <Suspense fallback={fallback || <DefaultFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  // Função de preload
  const preload = () => {
    importFn();
  };

  ComponentWithPreload.preload = preload;
  ComponentWithPreload.displayName = displayName || 'LazyComponent';

  return ComponentWithPreload as ComponentType<T> & { preload: () => void };
}

// ============================================================================
// LAZY ROUTES
// ============================================================================

export const LazyRoutes = {
  // Página Principal
  Dashboard: createLazyComponent({
    importFn: () => import('@/pages/Index'),
    displayName: 'Dashboard',
  }),

  // Agenda
  Schedule: createLazyComponent({
    importFn: () => import('@/pages/Schedule'),
    displayName: 'Schedule',
  }),

  // Pacientes
  Patients: createLazyComponent({
    importFn: () => import('@/pages/Patients'),
    displayName: 'Patients',
  }),

  // Evoluções
  PatientEvolution: createLazyComponent({
    importFn: () => import('@/pages/PatientEvolution'),
    displayName: 'PatientEvolution',
  }),

  // Financeiro
  Financial: createLazyComponent({
    importFn: () => import('@/pages/Financial'),
    displayName: 'Financial',
  }),

  // Perfil
  Profile: createLazyComponent({
    importFn: () => import('@/pages/Profile'),
    displayName: 'Profile',
  }),

  // Dashboard Inteligente
  SmartDashboard: createLazyComponent({
    importFn: () => import('@/pages/SmartDashboard'),
    displayName: 'SmartDashboard',
  }),
};

// ============================================================================
// PRELOAD ON HOVER HOOK
// ============================================================================

export const usePreloadOnHover = (
  preloadFn: () => void,
  options: { delay?: number } = {}
) => {
  const { delay = 200 } = options;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      preloadFn();
    }, delay);
  }, [preloadFn, delay]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave };
};

// ============================================================================
// ROUTE-BASED PRELOAD
// ============================================================================

interface PreloadConfig {
  routes: {
    path: string;
    preloadPaths?: string[];
    preload?: () => void;
  }[];
}

export const useRoutePreload = (config: PreloadConfig) => {
  const location = useLocation();
  const navigate = useNavigate();
  const loadedRoutesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentPath = location.pathname;

    // Encontrar rota atual
    const currentRoute = config.routes.find(
      (r) => currentPath.startsWith(r.path)
    );

    if (currentRoute) {
      // Preload rotas relacionadas
      currentRoute.preloadPaths?.forEach((path) => {
        if (!loadedRoutesRef.current.has(path)) {
          const route = config.routes.find((r) => r.path === path);
          if (route?.preload) {
            route.preload();
            loadedRoutesRef.current.add(path);
          }
        }
      });
    }
  }, [location.pathname, config.routes]);

  return {
    preloadRoute: (path: string) => {
      const route = config.routes.find((r) => r.path === path);
      if (route?.preload && !loadedRoutesRef.current.has(path)) {
        route.preload();
        loadedRoutesRef.current.add(path);
      }
    },
    navigateWithPreload: (path: string) => {
      const route = config.routes.find((r) => r.path === path);
      if (route?.preload) {
        route.preload();
      }
      setTimeout(() => navigate(path), 0);
    },
  };
};

// ============================================================================
// COMPONENTE DE LINK COM PRELOAD
// ============================================================================

interface PreloadLinkProps {
  to: string;
  children: ReactNode;
  preload?: () => void;
  className?: string;
  onClick?: () => void;
}

export const PreloadLink = ({
  to,
  children,
  preload,
  className,
  onClick,
}: PreloadLinkProps) => {
  const navigate = useNavigate();
  const { onMouseEnter, onMouseLeave } = usePreloadOnHover(
    () => {
      preload?.();
    },
    { delay: 100 }
  );

  const handleClick = useCallback(() => {
    onClick?.();
    navigate(to);
  }, [to, onClick, navigate]);

  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        handleClick();
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={className}
    >
      {children}
    </a>
  );
};

// ============================================================================
// SKELETON PARA DIFERENTES TIPOS DE CONTEÚDO
// ============================================================================

export const ContentSkeleton = ({ type = 'list' }: { type?: 'list' | 'card' | 'table' | 'detail' }) => {
  const skeletons = useMemo(() => {
    switch (type) {
      case 'list':
        return Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b">
            <div className="w-10 h-10 bg-muted/20 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-muted/20 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-muted/10 rounded animate-pulse" />
            </div>
          </div>
        ));
      case 'card':
        return Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-muted/20 rounded-lg mb-4 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted/20 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-muted/20 rounded animate-pulse" />
            </div>
          </div>
        ));
      case 'table':
        return (
          <div className="w-full">
            <div className="flex gap-4 p-3 bg-muted/5 border-b">
              <div className="flex-1 h-8 bg-muted/20 rounded animate-pulse" />
              <div className="flex-1 h-8 bg-muted/20 rounded animate-pulse" />
              <div className="flex-1 h-8 bg-muted/20 rounded animate-pulse" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-3 border-b">
                <div className="flex-1 h-10 bg-muted/10 rounded animate-pulse" />
                <div className="flex-1 h-10 bg-muted/10 rounded animate-pulse" />
                <div className="flex-1 h-10 bg-muted/10 rounded animate-pulse" />
              </div>
            ))}
          </div>
        );
      case 'detail':
        return (
          <div className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 bg-muted/20 rounded-full animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-6 w-1/2 bg-muted/20 rounded animate-pulse" />
                <div className="h-4 w-1/3 bg-muted/10 rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-4 w-full bg-muted/20 rounded animate-pulse" />
              <div className="h-20 w-full bg-muted/10 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-muted/20 rounded animate-pulse" />
              <div className="h-20 w-full bg-muted/10 rounded animate-pulse" />
            </div>
          </div>
        );
    }
  }, [type]);

  return <div className="space-y-2">{skeletons}</div>;
};

// ============================================================================
// ERROR BOUNDARY PARA COMPONENTES LAZY
// ============================================================================

interface LazyErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface LazyErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class LazyErrorBoundary extends React.Component<
  LazyErrorBoundaryProps,
  LazyErrorBoundaryState
> {
  constructor(props: LazyErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component failed to load:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">
              Erro ao carregar componente
            </h3>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || 'Ocorreu um erro inesperado.'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Tentar novamente
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
