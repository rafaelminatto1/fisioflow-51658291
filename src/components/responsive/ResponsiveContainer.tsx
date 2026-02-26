/**
 * ResponsiveContainer - Contêiner responsivo com breakpoints
 *
 * Features:
 * - Mobile-first design
 * - Breakpoint configuráveis
 * - Propriedades por breakpoint
 * - Hide/show por viewport
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useWindowSize } from '@/hooks/use-mobile';

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const BREAKPOINTS = {
  xs: 0,      // < 640px
  sm: 640,    // >= 640px
  md: 768,    // >= 768px
  lg: 1024,   // >= 1024px
  xl: 1280,   // >= 1280px
  '2xl': 1536, // >= 1536px
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// ============================================================================
// RESPONSIVE VALUE TYPE
// ============================================================================

export type ResponsiveValue<T> = T | {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
};

// ============================================================================
// USE BREAKPOINT HOOK
// ============================================================================

export const useBreakpoint = (): Breakpoint => {
  const { width } = useWindowSize();

  return useMemo(() => {
    if (width < BREAKPOINTS.sm) return 'xs';
    if (width < BREAKPOINTS.md) return 'sm';
    if (width < BREAKPOINTS.lg) return 'md';
    if (width < BREAKPOINTS.xl) return 'lg';
    if (width < BREAKPOINTS['2xl']) return 'xl';
    return '2xl';
  }, [width]);
};

export const useBreakpointValue = <T,>(value: ResponsiveValue<T>, defaultValue?: T): T => {
  const breakpoint = useBreakpoint();

  return useMemo(() => {
    if (typeof value === 'object' && value !== null) {
      // Check from current breakpoint up
      const keys = Object.keys(BREAKPOINTS) as Breakpoint[];
      for (let i = keys.indexOf(breakpoint); i < keys.length; i++) {
        const bp = keys[i];
        if (bp in value && value[bp] !== undefined) {
          return value[bp]!;
        }
      }
    }
    return (typeof value === 'object' ? defaultValue : value) as T;
  }, [value, breakpoint, defaultValue]);
};

// ============================================================================
// RESPONSIVE CONTAINER COMPONENT
// ============================================================================

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: Breakpoint | '100%';
  center?: boolean;
  padding?: ResponsiveValue<string>;
  gutters?: ResponsiveValue<boolean>;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  maxWidth = 'xl',
  center = true,
  padding = { xs: '1rem', sm: '1.5rem', md: '2rem' },
  gutters = { xs: true, sm: true, md: false },
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPadding = useBreakpointValue(padding, '1rem');
  const shouldHaveGutters = useBreakpointValue(gutters, true);

  const currentMaxWidth = maxWidth === '100%' ? '100%' : `${BREAKPOINTS[maxWidth]}px`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        maxWidth: currentMaxWidth,
        margin: center ? '0 auto' : undefined,
        padding: shouldHaveGutters ? currentPadding : undefined,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// SHOW/HIDE COMPONENTS
// ============================================================================

interface ShowProps {
  above?: Breakpoint;
  below?: Breakpoint;
  at?: Breakpoint;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Show: React.FC<ShowProps> = ({ above, below, at, children, fallback }) => {
  const { width } = useWindowSize();

  const shouldShow = useMemo(() => {
    if (at !== undefined) {
      return width >= BREAKPOINTS[at] && width < BREAKPOINTS[Object.keys(BREAKPOINTS)[Object.keys(BREAKPOINTS).indexOf(at) + 1] as Breakpoint];
    }
    if (above !== undefined) {
      return width >= BREAKPOINTS[above];
    }
    if (below !== undefined) {
      return width < BREAKPOINTS[below];
    }
    return true;
  }, [width, above, below, at]);

  return <>{shouldShow ? children : fallback ?? null}</>;
};

export const Hide: React.FC<ShowProps> = ({ above, below, at, children, fallback }) => {
  const { width } = useWindowSize();

  const shouldHide = useMemo(() => {
    if (at !== undefined) {
      return width >= BREAKPOINTS[at] && width < BREAKPOINTS[Object.keys(BREAKPOINTS)[Object.keys(BREAKPOINTS).indexOf(at) + 1] as Breakpoint];
    }
    if (above !== undefined) {
      return width >= BREAKPOINTS[above];
    }
    if (below !== undefined) {
      return width < BREAKPOINTS[below];
    }
    return false;
  }, [width, above, below, at]);

  return <>{shouldHide ? (fallback ?? null) : children}</>;
};

// ============================================================================
// GRID SYSTEM
// ============================================================================

interface GridProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
  cols?: ResponsiveValue<number>;
  gap?: ResponsiveValue<string>;
  autoFit?: boolean;
  minColWidth?: string;
}

export const Grid: React.FC<GridProps> = ({
  children,
  cols = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5, '2xl': 6 },
  gap = '1rem',
  autoFit = false,
  minColWidth = '250px',
  className,
  ...props
}) => {
  const currentCols = useBreakpointValue(cols, 1);
  const currentGap = useBreakpointValue(gap, '1rem');

  const style: React.CSSProperties = autoFit
    ? {
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidth}, 1fr))`,
        gap: currentGap,
      }
    : {
        display: 'grid',
        gridTemplateColumns: `repeat(${currentCols}, 1fr)`,
        gap: currentGap,
      };

  return (
    <div className={className} style={style} {...props}>
      {children}
    </div>
  );
};

// ============================================================================
// FLEX SYSTEM
// ============================================================================

interface FlexProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
  direction?: ResponsiveValue<'row' | 'column' | 'row-reverse' | 'column-reverse'>;
  wrap?: ResponsiveValue<'nowrap' | 'wrap' | 'wrap-reverse'>;
  justify?: ResponsiveValue<'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'>;
  align?: ResponsiveValue<'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'>;
  gap?: ResponsiveValue<string>;
}

export const Flex: React.FC<FlexProps> = ({
  children,
  direction = 'row',
  wrap = 'nowrap',
  justify = 'flex-start',
  align = 'flex-start',
  gap = '0',
  className,
  ...props
}) => {
  const currentDirection = useBreakpointValue(direction, 'row');
  const currentWrap = useBreakpointValue(wrap, 'nowrap');
  const currentJustify = useBreakpointValue(justify, 'flex-start');
  const currentAlign = useBreakpointValue(align, 'flex-start');
  const currentGap = useBreakpointValue(gap, '0');

  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: currentDirection,
    flexWrap: currentWrap,
    justifyContent: currentJustify,
    alignItems: currentAlign,
    gap: currentGap,
  };

  return (
    <div className={className} style={style} {...props}>
      {children}
    </div>
  );
};

// ============================================================================
// RESPONSIVE TEXT
// ============================================================================

interface ResponsiveTextProps {
  children: React.ReactNode;
  align?: ResponsiveValue<'left' | 'center' | 'right' | 'justify'>;
  size?: ResponsiveValue<'sm' | 'md' | 'lg' | 'xl' | '2xl'>;
  weight?: ResponsiveValue<'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold'>;
  truncate?: boolean;
  lines?: number;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  align,
  size,
  weight,
  truncate = false,
  lines,
  className,
  ...props
}) => {
  const currentAlign = useBreakpointValue(align);
  const currentSize = useBreakpointValue(size);
  const currentWeight = useBreakpointValue(weight);

  const style: React.CSSProperties = {
    textAlign: currentAlign,
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
  };

  const classes = [
    className,
    currentSize && sizeClasses[currentSize],
    currentWeight && weightClasses[currentWeight],
    truncate && 'truncate',
    lines && `line-clamp-${lines}`,
  ].filter(Boolean).join(' ');

  return (
    <p className={classes} style={style} {...props}>
      {children}
    </p>
  );
};

// ============================================================================
// USE MEDIA QUERY HOOK
// ============================================================================

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

// Pre-made media query hooks
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useIsLandscape = () => useMediaQuery('(orientation: landscape)');
export const useIsPortrait = () => useMediaQuery('(orientation: portrait)');
export const useIsTouch = () => useMediaQuery('(hover: none) and (pointer: coarse)');
export const useIsPrint = () => useMediaQuery('print');
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
export const usePrefersHighContrast = () => useMediaQuery('(prefers-contrast: high)');
