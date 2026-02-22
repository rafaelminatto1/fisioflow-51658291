/**
 * AdaptiveSectionCollapse - Responsive section collapse based on screen size
 *
 * Features:
 * - Mobile (<768px): Sections collapse to cards with expand/collapse
 * - Desktop: Continuous scroll with optional collapse
 * - Smooth max-height transitions
 * - State persists by section
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface AdaptiveSectionCollapseProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  forceCollapsed?: boolean;
  defaultExpanded?: boolean;
  onToggle?: (id: string, expanded: boolean) => void;
}

// Local storage key for section states
const STORAGE_KEY = 'fisioflow-section-collapse-states';

const getSavedStates = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveState = (id: string, expanded: boolean) => {
  try {
    const states = getSavedStates();
    states[id] = expanded;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch (error) {
    console.error('Failed to save section state:', error);
  }
};

const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

export const AdaptiveSectionCollapse: React.FC<AdaptiveSectionCollapseProps> = ({
  id,
  title,
  subtitle,
  icon,
  children,
  className,
  forceCollapsed = false,
  defaultExpanded = true,
  onToggle,
}) => {
  const [isMobileView, setIsMobileView] = useState(isMobile());
  const [expanded, setExpanded] = useState(() => {
    const savedStates = getSavedStates();
    // On mobile, default to collapsed unless explicitly saved
    if (isMobile()) {
      return savedStates[id] !== undefined ? savedStates[id] : false;
    }
    return savedStates[id] !== undefined ? savedStates[id] : defaultExpanded;
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = isMobile();
      setIsMobileView(mobile);
      // On mobile, default to collapsed if not explicitly set
      if (mobile && getSavedStates()[id] === undefined) {
        setExpanded(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  const handleToggle = useCallback(() => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    saveState(id, newExpanded);
    onToggle?.(id, newExpanded);
  }, [id, expanded, onToggle]);

  const shouldCollapse = forceCollapsed || (isMobileView && !expanded);

  return (
    <div
      id={id}
      className={cn(
        'adaptive-section-collapse',
        'transition-all duration-300 ease-out',
        isMobileView ? 'is-mobile' : 'is-desktop',
        shouldCollapse ? 'is-collapsed' : 'is-expanded',
        className
      )}
    >
      {/* Section header - always clickable on mobile */}
      <div
        onClick={isMobileView ? handleToggle : undefined}
        className={cn(
          'group flex items-center gap-3 px-4 py-3',
          'cursor-pointer',
          'border-b border-border/30',
          isMobileView && 'rounded-lg border',
          !isMobileView && 'hover:bg-muted/30',
          isMobileView && 'hover:bg-muted/50',
          'transition-colors'
        )}
        role="button"
        tabIndex={isMobileView ? 0 : -1}
        aria-expanded={expanded}
        aria-controls={`${id}-content`}
      >
        {icon && (
          <div className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
            {icon}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm truncate">
            {title}
          </h4>
          {subtitle && !shouldCollapse && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Collapse/expand indicator - only on mobile */}
        {isMobileView && (
          <div
            className={cn(
              'flex-shrink-0 transition-transform duration-300',
              expanded ? 'rotate-180' : 'rotate-0'
            )}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 6 l4 4 l4 -4" />
            </svg>
          </div>
        )}
      </div>

      {/* Section content */}
      <div
        id={`${id}-content`}
        className={cn(
          'transition-all duration-300 ease-out overflow-hidden',
          shouldCollapse && 'max-h-0 opacity-0',
          !shouldCollapse && 'max-h-[5000px] opacity-100'
        )}
      >
        <div className={cn('px-4 py-3', isMobileView && 'pt-2')}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Memoize for performance
export const MemoizedAdaptiveSectionCollapse = React.memo(AdaptiveSectionCollapse);
MemoizedAdaptiveSectionCollapse.displayName = 'AdaptiveSectionCollapse (Memoized)';
