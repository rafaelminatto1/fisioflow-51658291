import React, { useState, useEffect, memo, useCallback, useRef } from 'react';
import { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

// Import the legacy ResponsiveReactGridLayout to support the old API with draggableHandle
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Using internal module
import { ResponsiveReactGridLayout as Responsive } from 'react-grid-layout/dist/legacy';

export interface GridItem {
    id: string;
    content: React.ReactNode;
    defaultLayout: {
        w: number;
        h: number;
        x: number;
        y: number;
        minW?: number;
        minH?: number;
    };
}

interface DraggableGridProps {
    items: GridItem[];
    onLayoutChange?: (layout: Layout) => void;
    savedLayout?: Layout;
    className?: string;
    rowHeight?: number;
    cols?: { lg: number; md: number; sm: number; xs: number; xxs: number };
    isEditable?: boolean;
    forceReset?: boolean; // New prop to force layout reset
}

const DEFAULT_COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 } as const;
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const;
const GRID_MARGIN = [16, 16] as const;

// Custom hook to measure container width
const useWidth = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(1200);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) {
                    setWidth(entry.contentRect.width);
                }
            }
        });

        // Initial measure
        if (element.offsetWidth > 0) {
            setWidth(element.offsetWidth);
        }

        resizeObserver.observe(element);

        return () => resizeObserver.disconnect();
    }, []);

    return { containerRef, width };
};

export const DraggableGrid = memo(function DraggableGrid({
    items,
    onLayoutChange,
    savedLayout,
    className,
    rowHeight = 60,
    cols = DEFAULT_COLS,
    isEditable = false,
    forceReset = false,
}: DraggableGridProps) {
    const [layouts, setLayouts] = useState<Partial<Record<string, Layout>>>({});
    const [isMounted, setIsMounted] = useState(false);
    const { containerRef, width } = useWidth();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        // Create default layouts from items with their current positions
        const defaultLayouts = items.map((item) => ({
            i: item.id,
            ...item.defaultLayout,
        }));

        // If forceReset is true, ignore saved layout completely
        if (forceReset) {
            console.log('[DraggableGrid] Force reset - using default layouts');
            setLayouts({ lg: defaultLayouts });
            return;
        }

        // If no saved layout exists, use default layouts
        if (!savedLayout || savedLayout.length === 0) {
            setLayouts({ lg: defaultLayouts });
            return;
        }

        // Check if saved layout matches the expected number of items
        // If not, it's an old/incompatible layout - ignore it
        if (savedLayout.length !== items.length) {
            console.warn('[DraggableGrid] Saved layout has different number of items, using defaults');
            setLayouts({ lg: defaultLayouts });
            return;
        }

        // IMPORTANT: Check if the overall layout structure has changed significantly
        // This catches cases like Pain Scale expand/collapse where Y positions shift dramatically
        let totalYDiff = 0;
        let totalHDiff = 0;
        let itemsWithSignificantDiff = 0;

        const merged: Layout = defaultLayouts.map(def => {
            const saved = savedLayout.find(l => l.i === def.i);
            if (!saved) return def;

            // Calculate position difference
            const yDiff = Math.abs((saved.y || 0) - def.y);
            const xDiff = Math.abs((saved.x || 0) - def.x);
            const hDiff = Math.abs((saved.h || 0) - def.h);

            totalYDiff += yDiff;
            totalHDiff += hDiff;

            // If saved position is significantly different from default, use default
            // Threshold increased to handle Pain Scale expansion (height change from 5 to 16)
            if (yDiff > 5 || xDiff > 1 || hDiff > 5) {
                itemsWithSignificantDiff++;
                console.log(`[DraggableGrid] Item ${def.i}: saved state too far from default (yDiff:${yDiff}, xDiff:${xDiff}, hDiff:${hDiff}), using default`);
                return def;
            }

            // Only use saved dimensions and close positions
            return {
                ...def,
                w: saved.w || def.w,
                h: saved.h || def.h,
            };
        });

        // If more than 25% of items have significant differences, the entire layout structure has changed
        // (e.g., Pain Scale expanded/collapsed). Use all defaults in this case.
        if (itemsWithSignificantDiff > items.length * 0.25) {
            console.warn(`[DraggableGrid] Layout structure has changed significantly (${itemsWithSignificantDiff}/${items.length} items differ), using all defaults`);
            setLayouts({ lg: defaultLayouts });
            return;
        }

        setLayouts({ lg: merged });
    }, [items, savedLayout, forceReset]);

    const handleLayoutChange = useCallback((currentLayout: Layout, _allLayouts: Partial<Record<string, Layout>>) => {
        if (onLayoutChange) {
            onLayoutChange(currentLayout);
        }
    }, [onLayoutChange]);

    if (!isMounted) {
        return null;
    }

    return (
        <div ref={containerRef} className={className} style={{ position: 'relative' }}>
            <Responsive
                className="layout"
                layouts={layouts}
                breakpoints={BREAKPOINTS}
                cols={cols}
                rowHeight={rowHeight}
                width={width} // Pass the measured width
                draggableHandle=".drag-handle"
                isDraggable={isEditable}
                isResizable={isEditable}
                onLayoutChange={handleLayoutChange}
                margin={GRID_MARGIN}
                useCSSTransforms={true}
            >
                {items.map((item) => (
                    <div key={item.id}>
                        {item.content}
                    </div>
                ))}
            </Responsive>
        </div>
    );
});
DraggableGrid.displayName = 'DraggableGrid';

DraggableGrid.displayName = 'DraggableGrid';
