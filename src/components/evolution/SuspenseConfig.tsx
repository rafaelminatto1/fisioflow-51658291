/**
 * Suspense Config - Configurações de Suspense para otimização de loading
 *
 * Define boundaries granulares para diferentes tipos de conteúdo
 * Permite carregamento progressivo e melhor UX
 *
 * @version 2.0.0 - Performance Optimization
 */

import { Suspense, type ReactNode } from 'react';
import { OptimizedLoadingSkeleton } from './OptimizedEvolutionComponents';
import { cn } from '@/lib/utils';

// ==================== SUSPENSE BOUNDARIES ====================

interface SuspenseBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  /**
   * Delay antes de mostrar o fallback (evita flicker)
   * @default 150ms
   */
  delayMs?: number;
}

/**
 * Suspense Boundary para dados críticos (SOAP, dados principais do paciente)
 * Tem fallback mínimo para carregamento rápido
 */
export function CriticalDataBoundary({
  children,
  fallback,
  className,
}: SuspenseBoundaryProps) {
  const defaultFallback = (
    <div className={cn('space-y-4 animate-pulse', className)}>
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-32 bg-muted rounded" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

/**
 * Suspense Boundary para dados secundários (metas, patologias)
 * Carrega após dados críticos
 */
export function SecondaryDataBoundary({
  children,
  fallback,
  className,
}: SuspenseBoundaryProps) {
  const defaultFallback = (
    <div className={cn('p-4 border border-dashed rounded-lg', className)}>
      <div className="h-6 bg-muted/50 rounded w-1/2 mb-3" />
      <div className="space-y-2">
        <div className="h-4 bg-muted/30 rounded" />
        <div className="h-4 bg-muted/30 rounded w-5/6" />
      </div>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

/**
 * Suspense Boundary para dados pesados (gráficos, tabelas longas, histórico)
 * Carrega por último e com fallback mais elaborado
 */
export function HeavyDataBoundary({
  children,
  fallback,
  className,
}: SuspenseBoundaryProps) {
  const defaultFallback = <OptimizedLoadingSkeleton type="list" />;

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

/**
 * Suspense Boundary para componentes de IA
 * Tem feedback visual específico para processamento de IA
 */
export function AIComponentBoundary({
  children,
  fallback,
  className,
}: SuspenseBoundaryProps) {
  const defaultFallback = (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm text-muted-foreground">Processando com IA...</p>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

/**
 * Suspense Boundary para mídia (imagens, vídeos)
 * Carrega com placeholder visual
 */
export function MediaBoundary({
  children,
  fallback,
  className,
}: SuspenseBoundaryProps) {
  const defaultFallback = (
    <div className={cn('aspect-square bg-muted/30 rounded-lg flex items-center justify-center', className)}>
      <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

// ==================== WRAPERS COMBINADOS ====================

/**
 * Wrapper para página de evolução com múltiplas boundaries
 * Organiza o carregamento em prioridades
 */
export function EvolutionSuspenseLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Dados críticos carregam primeiro */}
      <CriticalDataBoundary>
        {children}
      </CriticalDataBoundary>
    </>
  );
}

/**
 * Wrapper para aba de avaliação com boundaries otimizadas
 */
export function AssessmentTabSuspense({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <CriticalDataBoundary>
        {/* Medições críticas */}
        {children}
      </CriticalDataBoundary>
    </div>
  );
}

/**
 * Wrapper para aba de histórico com boundaries otimizadas
 */
export function HistoryTabSuspense({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <HeavyDataBoundary>
        {/* Timeline completa de evoluções */}
        {children}
      </HeavyDataBoundary>
    </div>
  );
}

/**
 * Wrapper para aba de assistente (IA) com boundaries otimizadas
 */
export function AssistantTabSuspense({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <AIComponentBoundary>
        {/* Componentes de IA */}
        {children}
      </AIComponentBoundary>
    </div>
  );
}

// ==================== FALLBACK COMPONENTS ====================

/**
 * Fallback para cards de informação
 */
export function CardFallback({ className }: { className?: string }) {
  return (
    <div className={cn('border rounded-lg p-4 space-y-3', className)}>
      <div className="h-5 bg-muted/50 rounded w-1/3" />
      <div className="h-4 bg-muted/30 rounded w-full" />
      <div className="h-4 bg-muted/30 rounded w-5/6" />
    </div>
  );
}

/**
 * Fallback para listas
 */
export function ListFallback({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          <div className="w-10 h-10 bg-muted/50 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted/30 rounded w-3/4" />
            <div className="h-3 bg-muted/20 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Fallback para grid
 */
export function GridFallback({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <CardFallback key={i} />
      ))}
    </div>
  );
}
