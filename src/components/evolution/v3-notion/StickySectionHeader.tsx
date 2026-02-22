/**
 * StickySectionHeader - Sticky header that follows scroll position
 *
 * Features:
 * - Stays fixed at top when scrolling past section
 * - Shows progress bar within section
 * - "Back to top" button after scrolling 2 sections
 * - Smooth animation when fixing/unfixing
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StickySectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  sectionId: string;
  progress?: number; // 0-100
  showBackToTop?: boolean;
  onBackToTop?: () => void;
  className?: string;
  accentColor?: 'sky' | 'violet' | 'amber' | 'rose' | 'emerald';
}

const ACCENT_COLORS = {
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  emerald: 'bg-emerald-500',
};

export const StickySectionHeader: React.FC<StickySectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  sectionId,
  progress = 0,
  showBackToTop = false,
  onBackToTop,
  className,
  accentColor = 'sky',
}) => {
  const [isSticky, setIsSticky] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!headerRef.current || !sentinelRef.current) return;

    // Create sentinel element to detect when header should become sticky
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '0px 0px -100% 0px', // Trigger when sentinel goes out of view
      }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Handle smooth scroll to section
  const scrollToSection = useCallback(() => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  }, [sectionId]);

  const accentClass = ACCENT_COLORS[accentColor];

  return (
    <>
      {/* Sentinel element for sticky detection */}
      <div ref={sentinelRef} className="h-0" />

      <div
        ref={headerRef}
        className={cn(
          'sticky-section-header',
          'transition-all duration-300 ease-out',
          isSticky && 'is-sticky',
          showBackToTop && 'show-back-to-top',
          className
        )}
        style={{
          position: isSticky ? 'fixed' : 'relative',
          top: isSticky ? '0px' : 'auto',
          zIndex: isSticky ? 40 : 'auto',
          backgroundColor: isSticky ? 'hsl(var(--background))' : 'transparent',
          boxShadow: isSticky ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        <div
          onClick={scrollToSection}
          className={cn(
            'px-6 py-3 cursor-pointer hover:bg-muted/50 transition-colors',
            'flex items-center gap-3'
          )}
          role="button"
          tabIndex={0}
          aria-label={`Ir para seção ${title}`}
        >
          {icon && (
            <div className="flex-shrink-0">{icon}</div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'font-semibold text-foreground',
              isSticky ? 'text-sm' : 'text-base',
              'transition-all duration-200'
            )}>
              {title}
            </h3>
            {subtitle && !isSticky && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          {/* Progress bar */}
          {progress > 0 && (
            <div className="flex-1 max-w-[200px] ml-4">
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300 ease-out',
                    accentClass
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Back to top button */}
          {showBackToTop && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onBackToTop?.();
              }}
              className="ml-2"
              aria-label="Voltar ao topo"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

// Memoize for performance
export const MemoizedStickySectionHeader = React.memo(StickySectionHeader);
MemoizedStickySectionHeader.displayName = 'StickySectionHeader (Memoized)';
