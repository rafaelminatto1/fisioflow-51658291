/**
 * useSwipeGestures - Hook for handling swipe gestures on mobile
 *
 * Features:
 * - Swipe left/right to jump between sections
 * - Swipe down to show save menu
 * - Swipe up to show quick actions
 * - Haptic feedback on gesture completion
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export type SwipeCallback = (direction: SwipeDirection) => void;

export interface SwipeGestureConfig {
  onSwipeLeft?: SwipeCallback;
  onSwipeRight?: SwipeCallback;
  onSwipeUp?: SwipeCallback;
  onSwipeDown?: SwipeCallback;
  threshold?: number; // Minimum distance in pixels
  disabled?: boolean;
  hapticFeedback?: boolean;
}

interface SwipeState {
  startX: number;
  startY: number;
  isDragging: boolean;
}

export const useSwipeGestures = (config: SwipeGestureConfig) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    disabled = false,
    hapticFeedback = true,
  } = config;

  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    isDragging: false,
  });
  const elementRef = useRef<HTMLElement | null>(null);

  // Trigger haptic feedback if supported
  const triggerHaptic = useCallback(() => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration
    }
  }, [hapticFeedback]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    stateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      isDragging: true,
    };
  }, [disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !stateRef.current.isDragging) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - stateRef.current.startX;
    const deltaY = touch.clientY - stateRef.current.startY;

    // Prevent default scroll if we're detecting a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold / 2) {
      e.preventDefault();
    }
  }, [disabled, threshold]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (disabled || !stateRef.current.isDragging) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - stateRef.current.startX;
    const deltaY = touch.clientY - stateRef.current.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    stateRef.current.isDragging = false;

    // Determine if this is a valid swipe gesture
    if (Math.max(absDeltaX, absDeltaY) < threshold) {
      return; // Didn't move enough
    }

    // Determine direction
    let direction: SwipeDirection | null = null;

    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (deltaX > 0) {
        direction = 'right';
        onSwipeRight?.(direction);
      } else {
        direction = 'left';
        onSwipeLeft?.(direction);
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        direction = 'down';
        onSwipeDown?.(direction);
      } else {
        direction = 'up';
        onSwipeUp?.(direction);
      }
    }

    if (direction) {
      triggerHaptic();
    }
  }, [disabled, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, triggerHaptic]);

  // Attach event listeners to element
  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Function to attach to an element
  const attach = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
  }, []);

  return { attach };
};

// Higher-order component for swipe gestures
export interface WithSwipeGesturesProps {
  swipeConfig?: SwipeGestureConfig;
}

export const withSwipeGestures = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WithSwipeGesturesComponent = React.forwardRef<any, P & WithSwipeGesturesProps>(
    ({ swipeConfig, ...props }, ref) => {
      const { attach } = useSwipeGestures(swipeConfig || {});
      const elementRef = useRef<HTMLElement>(null);

      // Update ref when element changes
      useEffect(() => {
        if (elementRef.current) {
          attach(elementRef.current);
        }
      }, [attach]);

      return (
        <div ref={elementRef as any}>
          <Component {...(props as P)} ref={ref} />
        </div>
      );
    }
  );

  WithSwipeGesturesComponent.displayName = `withSwipeGestures(${Component.displayName || Component.name})`;
  return WithSwipeGesturesComponent;
};

// Hook for section navigation with swipe
export interface SectionSwipeConfig {
  sections: Array<{ id: string; title: string }>;
  currentSectionIndex: number;
  onSectionChange: (index: number) => void;
}

export const useSectionSwipe = (config: SectionSwipeConfig) => {
  const { sections, currentSectionIndex, onSectionChange } = config;
  const [hintVisible, setHintVisible] = useState(false);

  const handleSwipeLeft = useCallback(() => {
    const nextIndex = Math.min(currentSectionIndex + 1, sections.length - 1);
    if (nextIndex !== currentSectionIndex) {
      onSectionChange(nextIndex);
      showHint(`Ir para: ${sections[nextIndex].title}`);
    }
  }, [currentSectionIndex, sections, onSectionChange]);

  const handleSwipeRight = useCallback(() => {
    const prevIndex = Math.max(currentSectionIndex - 1, 0);
    if (prevIndex !== currentSectionIndex) {
      onSectionChange(prevIndex);
      showHint(`Ir para: ${sections[prevIndex].title}`);
    }
  }, [currentSectionIndex, sections, onSectionChange]);

  const hintTimeoutRef = useRef<NodeJS.Timeout>();

  const showHint = useCallback((message: string) => {
    setHintVisible(true);

    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }

    hintTimeoutRef.current = setTimeout(() => {
      setHintVisible(false);
    }, 2000);
  }, []);

  const { attach } = useSwipeGestures({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 100, // Higher threshold for navigation to prevent accidental swipes
  });

  return {
    attach,
    hintVisible,
    hintMessage: hintVisible
      ? sections[Math.min(currentSectionIndex + 1, sections.length - 1)]?.title ||
        sections[Math.max(currentSectionIndex - 1, 0)]?.title
      : '',
  };
};

// Helper component for swipe hint
export const SwipeHint: React.FC<{
  visible: boolean;
  message: string;
  direction: 'left' | 'right' | 'up' | 'down';
  className?: string;
}> = ({ visible, message, direction, className }) => {
  if (!visible) return null;

  const arrows = {
    left: '←',
    right: '→',
    up: '↑',
    down: '↓',
  };

  return (
    <div
      className={cn(
        'fixed bottom-24 left-1/2 -translate-x-1/2',
        'px-4 py-2 rounded-full',
        'bg-primary text-primary-foreground',
        'text-sm font-medium shadow-lg',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
        'flex items-center gap-2',
        className
      )}
    >
      <span className="text-lg">{arrows[direction]}</span>
      <span>{message}</span>
    </div>
  );
};
