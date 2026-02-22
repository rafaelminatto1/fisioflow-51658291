/**
 * PullToRefresh - Componente de pull-to-refresh para mobile
 *
 * Permite que o usuário puxe para baixo para atualizar o calendário
 * Padrão mobile nativo familiar
 */

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  isRefreshing?: boolean;
  className?: string;
  pullThreshold?: number; // Pixels needed to trigger refresh (default: 80)
  disabled?: boolean;
}

const PullToRefresh = memo(({
  onRefresh,
  isRefreshing = false,
  className,
  pullThreshold = 80,
  disabled = false
}: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isReleaseReady, setIsReleaseReady] = useState(false);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Touch handlers com memoização
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
    setIsPulling(true);
    setIsReleaseReady(false);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing || !isPulling) return;

    const y = e.touches[0].clientY;
    const delta = y - startY.current;

    // Só permitir pull para baixo (delta positivo)
    if (delta <= 0) return;

    // Calcular distância com resistência inicial
    const resistance = Math.max(0, delta - 20); // 20px de resistência
    setPullDistance(Math.min(resistance, pullThreshold * 1.5));
    currentY.current = y;

    // Haptic feedback conforme puxa
    if ('vibrate' in navigator && navigator.vibrate) {
      if (delta > 60 && !isReleaseReady) {
        navigator.vibrate([10]);
        setIsReleaseReady(true);
      }
    }
  }, [disabled, isRefreshing, isPulling, isReleaseReady, pullThreshold]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || isRefreshing) return;

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Se puxou o suficiente, disparar refresh
    if (isReleaseReady && pullDistance >= pullThreshold) {
      // Haptic feedback de confirmação
      if ('vibrate' in navigator && navigator.vibrate) {
        navigator.vibrate([20, 30]);
      }

      timeoutRef.current = setTimeout(() => {
        Promise.resolve(onRefresh());
      }, 100);
    } else {
      // Retornar suavemente
      resetState();
    }
  }, [disabled, isRefreshing, isReleaseReady, pullDistance, onRefresh]);

  const resetState = useCallback(() => {
    setPullDistance(0);
    setIsPulling(false);
    setIsReleaseReady(false);
    startY.current = 0;
    currentY.current = 0;
  }, []);

  // Mouse handlers para desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || isRefreshing) return;
    startY.current = e.clientY;
    setIsPulling(true);
    setIsReleaseReady(false);
  }, [disabled, isRefreshing]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (disabled || isRefreshing || !isPulling) return;

    const delta = e.clientY - startY.current;
    if (delta <= 0) return;

    const resistance = Math.max(0, delta - 20);
    setPullDistance(Math.min(resistance, pullThreshold * 1.5));
  }, [disabled, isRefreshing, isPulling, pullThreshold]);

  const handleMouseUp = useCallback(() => {
    if (disabled || isRefreshing) return;

    if (isReleaseReady && pullDistance >= pullThreshold) {
      Promise.resolve(onRefresh());
    } else {
      resetState();
    }
  }, [disabled, isRefreshing, isReleaseReady, pullDistance, onRefresh, resetState]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Calcular opacidade e escala baseados na distância do pull
  const progress = Math.min(pullDistance / pullThreshold, 1);
  const opacity = Math.max(0.3, 1 - progress * 0.7);
  const scale = 1 + progress * 0.1;

  return (
    <div
      className={cn('relative', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Indicador de pull - aparece quando começa a puxar */}
      {pullDistance > 10 && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-150 ease-out"
          style={{
            transform: `translateY(${pullDistance}px) scale: ${scale}`,
            opacity
          }}
        >
          {isRefreshing ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-b-xl">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Atualizando...</span>
            </div>
          ) : isReleaseReady ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-b-xl">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Solte para atualizar</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-b-xl">
              <RefreshCw className="w-5 h-5" />
              <span className="text-sm font-medium">Puxe para atualizar</span>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo do calendário */}
      <div className="min-h-[100px]">
        {/* Children content goes here - the calendar grid */}
      </div>
    </div>
  );
});

PullToRefresh.displayName = 'PullToRefresh';

export { PullToRefresh };
