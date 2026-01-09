import React, { memo } from 'react';
import { useIntersectionObserver } from '@/hooks/performance/useIntersectionObserver';

interface LazyComponentProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  rootMargin?: string;
  className?: string;
}

/**
 * Wrapper para lazy render de componentes
 * Só renderiza o conteúdo quando visível na viewport
 */
export const LazyComponent = memo(function LazyComponent({
  children,
  placeholder = <div className="h-32 animate-pulse bg-muted rounded-lg" />,
  rootMargin = '100px',
  className,
}: LazyComponentProps) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
    rootMargin,
    freezeOnceVisible: true,
  });

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : placeholder}
    </div>
  );
});

// VirtualizedList removed as unused
