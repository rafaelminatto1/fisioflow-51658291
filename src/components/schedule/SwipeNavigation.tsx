/**
 * SwipeNavigation - Componente de navegação por swipe gesture
 *
 * Detecta gestos de swipe para navegar entre dias/semanas
 * - Swipe left: dia anterior / semana anterior
 * - Swipe right: próximo dia / próxima semana
 */

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SwipeNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  children: React.ReactNode;
  className?: string;
  sensitivity?: number; // Threshold mínimo para swipe (default: 50px)
  disabled?: boolean;
  showIndicators?: boolean;
}

const SwipeNavigation = memo(({
  onPrevious,
  onNext,
  children,
  className,
  sensitivity = 50,
  disabled = false,
  showIndicators = true
}: SwipeNavigationProps) => {
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const startX = useRef<number>(0);
  const currentX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resetar animação após completar
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setDirection(null);
        setSwipeProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isAnimating) return;
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
  }, [disabled, isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isAnimating) return;

    const x = e.touches[0].clientX;
    const delta = x - startX.current;
    const absDelta = Math.abs(delta);

    // Atualizar progresso do swipe
    if (absDelta > 0 && absDelta < sensitivity) {
      setSwipeProgress(absDelta / sensitivity);
    }

    // Detectar direção após passar threshold
    if (absDelta >= sensitivity) {
      const newDirection = delta > 0 ? 'right' : 'left';

      if (newDirection !== direction) {
        setDirection(newDirection);
        currentX.current = x;
      }
    }
  }, [disabled, isAnimating, sensitivity, direction]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || isAnimating) return;

    const delta = currentX.current - startX.current;
    const absDelta = Math.abs(delta);

    if (absDelta >= sensitivity) {
      if (delta > 0) {
        // Swipe right - próximo
        setIsAnimating(true);
        onNext();

        // Haptic feedback
        if ('vibrate' in navigator && navigator.vibrate) {
          navigator.vibrate([10, 20, 10]);
        }
      } else if (delta < 0) {
        // Swipe left - anterior
        setIsAnimating(true);
        onPrevious();

        // Haptic feedback
        if ('vibrate' in navigator && navigator.vibrate) {
          navigator.vibrate([10, 20, 10]);
        }
      }
    }

    setSwipeProgress(0);
    setDirection(null);
  }, [disabled, isAnimating, sensitivity, onNext, onPrevious]);

  // Mouse handlers para desktop (opcional)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || isAnimating) return;
    startX.current = e.clientX;
  }, [disabled, isAnimating]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (disabled || isAnimating) return;

    const delta = e.clientX - startX.current;
    const absDelta = Math.abs(delta);

    if (absDelta > 0 && absDelta < sensitivity) {
      setSwipeProgress(absDelta / sensitivity);
    }

    if (absDelta >= sensitivity) {
      const newDirection = delta > 0 ? 'right' : 'left';
      if (newDirection !== direction) {
        setDirection(newDirection);
        currentX.current = e.clientX;
      }
    }
  }, [disabled, isAnimating, sensitivity, direction]);

  const handleMouseUp = useCallback(() => {
    if (disabled || isAnimating) return;

    const delta = currentX.current - startX.current;
    const absDelta = Math.abs(delta);

    if (absDelta >= sensitivity) {
      if (delta > 0) {
        setIsAnimating(true);
        onNext();
      } else if (delta < 0) {
        setIsAnimating(true);
        onPrevious();
      }
    }

    setSwipeProgress(0);
    setDirection(null);
  }, [disabled, isAnimating, sensitivity, onNext, onPrevious]);

  // Indicadores de swipe
  const showLeftIndicator = showIndicators && direction === 'left' && swipeProgress > 0.3;
  const showRightIndicator = showIndicators && direction === 'right' && swipeProgress > 0.3;

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ touchAction: 'pan-x' }}
    >
      {/* Indicador visual de swipe left */}
      {showLeftIndicator && (
        <div className="absolute top-1/2 left-0 right-0 bottom-1/2 flex items-center justify-center pointer-events-none">
          <div
            className={cn(
              'bg-white dark:bg-slate-900 rounded-full shadow-lg transition-all duration-200',
              isAnimating ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
            )}
          >
            <ChevronLeft className="w-8 h-8 text-primary animate-pulse" />
          </div>
        </div>
      )}

      {/* Conteúdo com animação de transição */}
      <div
        className={cn(
          'transition-transform duration-300 ease-out',
          isAnimating && direction === 'right' && 'translate-x-full opacity-0',
          isAnimating && direction === 'left' && '-translate-x-full opacity-0'
        )}
      >
        {children}
      </div>

      {/* Indicador visual de swipe right */}
      {showRightIndicator && (
        <div className="absolute top-1/2 left-0 right-0 bottom-1/2 flex items-center justify-center pointer-events-none">
          <div
            className={cn(
              'bg-white dark:bg-slate-900 rounded-full shadow-lg transition-all duration-200',
              isAnimating ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
            )}
          >
            <ChevronRight className="w-8 h-8 text-primary animate-pulse" />
          </div>
        </div>
      )}

      {/* Barra de progresso do swipe */}
      {swipeProgress > 0.1 && !isAnimating && (
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-1 bg-primary/50 rounded-full transition-all duration-75',
            direction === 'left' ? 'origin-right' : 'origin-left'
          )}
          style={{
            transform: direction === 'left' ? `translateX(${-swipeProgress * 100}%)` : `translateX(${swipeProgress * 100}%)`,
            scaleX: direction === 'left' ? `${1 + swipeProgress}` : `${1 - swipeProgress}`
          }}
        />
      )}
    </div>
  );
});

SwipeNavigation.displayName = 'SwipeNavigation';

export { SwipeNavigation };
