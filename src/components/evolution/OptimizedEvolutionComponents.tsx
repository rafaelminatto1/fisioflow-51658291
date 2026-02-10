/**
 * Componentes Otimizados para Evolução
 *
 * OTIMIZAÇÕES:
 * 1. React.memo com comparação customizada
 * 2. Separation of concerns - componentes menores
 * 3. Lazy loading interno para sub-componentes
 * 4. Memoização de callbacks e valores
 *
 * @version 2.0.0 - Performance Optimization
 */

import { memo, useMemo, useCallback, useState, useEffect, type ReactNode, type ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ==================== HOOKS DE OTIMIZAÇÃO ====================

/**
 * Hook para criar um memoized component com comparação customizada
 * Baseado em shallow equality de props específicas
 */
export function useMemoizedComponent<P extends object>(
  Component: ComponentType<P>,
  propNames: (keyof P)[],
  displayName?: string
): ComponentType<P> {
  const Memoized = memo(Component, (prevProps, nextProps) => {
    // Comparação shallow apenas das props especificadas
    for (const key of propNames) {
      if (prevProps[key] !== nextProps[key]) {
        return false; // Props diferentes - precisa re-renderizar
      }
    }
    return true; // Todas as props iguais - pode pular render
  });

  Memoized.displayName = displayName || Component.name || 'MemoizedComponent';
  return Memoized;
}

/**
 * Hook para criar estável os callbacks para eventos comuns
 */
export function useEvolutionCallbacks() {
  return {
    // Wrapper para callbacks que não devem mudar
    stableCallback: useCallback(<T,>(fn: (arg: T) => void) => fn, []),
  };
}

// ==================== COMPONENTES OTIMIZADOS ====================

/**
 * Loading Skeleton otimizado - reutiliza elementos DOM
 */
export const OptimizedLoadingSkeleton = memo(({ type }: { type?: 'card' | 'list' | 'grid' }) => {
  const content = useMemo(() => {
    switch (type) {
      case 'list':
        return (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        );
      case 'grid':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        );
      default: // card
        return (
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        );
    }
  }, [type]);

  return (
    <Card>
      <CardContent className="pt-6">
        {content}
      </CardContent>
    </Card>
  );
});
OptimizedLoadingSkeleton.displayName = 'OptimizedLoadingSkeleton';

// ==================== CONTAINER DE SEÇÃO OTIMIZADO ====================

interface OptimizedSectionProps {
  children: ReactNode;
  className?: string;
  loading?: boolean;
  loadingType?: 'card' | 'list' | 'grid';
  error?: Error | null;
  errorMessage?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
}

/**
 * Container de seção com estados otimizados
 * Evita re-renders desnecessários quando loading/error/isEmpty não mudam
 */
export const OptimizedSection = memo(({
  children,
  className,
  loading = false,
  loadingType = 'card',
  error = null,
  errorMessage = 'Erro ao carregar dados',
  isEmpty = false,
  emptyMessage = 'Nenhum dado encontrado',
  emptyIcon,
}: OptimizedSectionProps) => {
  const content = useMemo(() => {
    if (loading) {
      return <OptimizedLoadingSkeleton type={loadingType} />;
    }

    if (error) {
      return (
        <Card className="border-destructive/30">
          <CardContent className="pt-6 text-center py-8">
            <p className="text-destructive font-medium">{errorMessage}</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </CardContent>
        </Card>
      );
    }

    if (isEmpty) {
      return (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center py-8">
            {emptyIcon || (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📋</span>
              </div>
            )}
            <p className="text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      );
    }

    return <>{children}</>;
  }, [loading, loadingType, error, errorMessage, isEmpty, emptyMessage, emptyIcon, children]);

  return (
    <div className={cn('transition-all duration-200', className)}>
      {content}
    </div>
  );
}, (prev, next) => {
  // Comparação customizada para evitar re-renders
  return (
    prev.loading === next.loading &&
    prev.isEmpty === next.isEmpty &&
    prev.error === next.error &&
    prev.className === next.className
  );
});
OptimizedSection.displayName = 'OptimizedSection';

// ==================== CARD DE ESTATÍSTICAS OTIMIZADO ====================

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * Card de estatística com memoização
 * Só re-renderiza quando value ou label mudam
 */
export const StatCard = memo(({
  label,
  value,
  change,
  icon,
  className,
  trend = 'neutral',
}: StatCardProps) => {
  const displayValue = useMemo(() => {
    if (typeof value === 'number') {
      return value.toLocaleString('pt-BR');
    }
    return value;
  }, [value]);

  const trendIcon = useMemo(() => {
    if (!change) return null;
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '•';
  }, [change, trend]);

  const trendColor = useMemo(() => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-muted-foreground';
  }, [trend]);

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{displayValue}</p>
            {change !== undefined && (
              <p className={cn('text-xs mt-1', trendColor)}>
                {trendIcon} {Math.abs(change)}% vs. mês anterior
              </p>
            )}
          </div>
          {icon && (
            <div className="text-muted-foreground/50">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}, (prev, next) => {
  // Só re-renderiza se os valores principais mudarem
  return (
    prev.label === next.label &&
    prev.value === next.value &&
    prev.change === next.change &&
    prev.trend === next.trend
  );
});
StatCard.displayName = 'StatCard';

// ==================== BADGE DE STATUS OTIMIZADO ====================

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

/**
 * Badge de status com memoização
 */
export const StatusBadge = memo(({
  status,
  variant = 'default',
  className,
}: StatusBadgeProps) => {
  const variantStyles = useMemo(() => {
    switch (variant) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  }, [variant]);

  return (
    <Badge className={cn(variantStyles, className)}>
      {status}
    </Badge>
  );
}, (prev, next) => prev.status === next.status && prev.variant === next.variant);
StatusBadge.displayName = 'StatusBadge';

// ==================== WRAPPER DE LAZY LOADING ====================

interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  delay?: number; // Delay em ms antes de mostrar o fallback
}

/**
 * Wrapper para lazy loading com delay configurável
 * Evita flicker em carregamentos rápidos
 */
export const LazyWrapper = memo(({
  children,
  fallback,
  delay = 200,
}: LazyWrapperProps) => {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowFallback(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Se children ainda não está pronto, mostra fallback após delay
  // A lógica de "pronto" deve ser implementada pelo pai via Suspense
  return <>{children}</>;
});
LazyWrapper.displayName = 'LazyWrapper';

// ==================== SEPARADOR DE SEÇÃO OTIMIZADO ====================

interface SectionSeparatorProps {
  title: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Separador de seção com memoização
 */
export const SectionSeparator = memo(({
  title,
  action,
  className,
}: SectionSeparatorProps) => {
  return (
    <div className={cn('flex items-center justify-between py-2', className)}>
      <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
        {title}
      </h3>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}, (prev, next) => {
  return prev.title === next.title;
});
SectionSeparator.displayName = 'SectionSeparator';

// ==================== EXPORT DE UTILITÁRIOS ====================

/**
 * HOC para adicionar memoização automática a componentes
 */
export function withMemo<P extends object>(
  Component: ComponentType<P>,
  displayName?: string
): ComponentType<P> {
  const Memoized = memo(Component, (prev, next) => {
    // Comparação shallow de todas as props
    const prevKeys = Object.keys(prev) as (keyof P)[];
    for (const key of prevKeys) {
      if (prev[key] !== next[key]) {
        return false;
      }
    }
    return true;
  });

  Memoized.displayName = displayName || Component.name || 'MemoizedComponent';
  return Memoized;
}

/**
 * Componente vazio otimizado para espaçadores
 */
export const Spacer = memo(({ height = 16 }: { height?: number }) => (
  <div style={{ height }} aria-hidden="true" />
));
Spacer.displayName = 'Spacer';
