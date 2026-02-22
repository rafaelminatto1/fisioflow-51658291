/**
 * CompactViewMode - Toggle for compact section view
 *
 * Features:
 * - Sections condense to title-only view
 * - Tap to expand section
 * - Reduces scroll by 40-50%
 * - Ideal for reviewing completed evolutions
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CompactViewContextValue {
  compact: boolean;
  toggleCompact: () => void;
  setCompact: (compact: boolean) => void;
}

const CompactViewContext = createContext<CompactViewContextValue | undefined>(undefined);

export const CompactViewProvider: React.FC<{
  children: React.ReactNode;
  defaultCompact?: boolean;
}> = ({ children, defaultCompact = false }) => {
  const [compact, setCompact] = useState(defaultCompact);

  const toggleCompact = useCallback(() => {
    setCompact(prev => !prev);
  }, []);

  const value = {
    compact,
    toggleCompact,
    setCompact,
  };

  return (
    <CompactViewContext.Provider value={value}>
      {children}
    </CompactViewContext.Provider>
  );
};

export const useCompactView = (): CompactViewContextValue => {
  const context = useContext(CompactViewContext);
  if (!context) {
    throw new Error('useCompactView must be used within CompactViewProvider');
  }
  return context;
};

interface CompactViewToggleProps {
  className?: string;
  disabled?: boolean;
}

export const CompactViewToggle: React.FC<CompactViewToggleProps> = ({
  className,
  disabled = false,
}) => {
  const { compact, toggleCompact } = useCompactView();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleCompact}
      disabled={disabled}
      className={cn('gap-2', className)}
      aria-label={compact ? 'Expandir visualização' : 'Compactar visualização'}
      title={compact ? 'Expandir visualização' : 'Compactar visualização'}
    >
      {compact ? (
        <>
          <Maximize2 className="h-4 w-4" />
          <span>Expandir</span>
        </>
      ) : (
        <>
          <Minimize2 className="h-4 w-4" />
          <span>Compactar</span>
        </>
      )}
    </Button>
  );
};

interface CompactSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isComplete?: boolean;
  className?: string;
}

export const CompactSection: React.FC<CompactSectionProps> = ({
  id,
  title,
  subtitle,
  icon,
  children,
  isComplete = false,
  className,
}) => {
  const { compact } = useCompactView();
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    if (compact) {
      setExpanded(prev => !prev);
    }
  };

  return (
    <div
      id={id}
      className={cn(
        'compact-section',
        'transition-all duration-300 ease-out',
        compact ? 'is-compact' : 'is-expanded',
        !compact && expanded && setExpanded(false),
        className
      )}
    >
      {/* Section header - always visible */}
      <div
        onClick={handleToggle}
        className={cn(
          'group flex items-center gap-3 px-4 py-3 cursor-pointer',
          'hover:bg-muted/50 transition-colors',
          'border-b border-border/30',
          compact && 'rounded-lg border'
        )}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`${id}-content`}
      >
        {icon && (
          <div className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
            {icon}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground text-sm truncate">
              {title}
            </h4>
            {isComplete && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            )}
          </div>
          {subtitle && !compact && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        {compact && (
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
          compact && !expanded && 'max-h-0 opacity-0',
          compact && expanded && 'max-h-[2000px] opacity-100',
          !compact && 'opacity-100'
        )}
      >
        <div className={cn('px-4 py-3', compact && 'pt-2')}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Memoize for performance
export const MemoizedCompactSection = React.memo(CompactSection);
MemoizedCompactSection.displayName = 'CompactSection (Memoized)';
