import React, { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyWidgetProps {
  children: React.ReactNode;
  height?: string | number;
  className?: string;
  fallback?: React.ReactNode;
}

export const LazyWidget: React.FC<LazyWidgetProps> = ({ 
  children, 
  height = '200px', 
  className = '',
  fallback
}) => {
  const [isIntersecting, setIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIntersecting(true);
          observer.unobserve(ref.current!);
        }
      },
      {
        rootMargin: '100px', // Carrega um pouco antes de entrar na tela
      }
    );

    observer.observe(ref.current);

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, []);

  return (
    <div ref={ref} className={className} style={{ minHeight: isIntersecting ? 'auto' : height }}>
      {isIntersecting ? (
        children
      ) : (
        fallback || (
          <div className="w-full h-full flex flex-col space-y-3">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-[150px] w-full" />
          </div>
        )
      )}
    </div>
  );
};
