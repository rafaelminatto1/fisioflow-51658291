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
const GRID_MARGIN = [20, 20] as const; // Increased margin to prevent overlap

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
    className,
    rowHeight = 60,
    cols = DEFAULT_COLS,
    isEditable = false,
}: Omit<DraggableGridProps, 'savedLayout' | 'forceReset'>) {
    const [isMounted, setIsMounted] = useState(false);
    const { containerRef, width } = useWidth();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Handle layout changes - don't store internal layout state
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
                // Don't pass layouts at all - let data-grid control everything
                breakpoints={BREAKPOINTS}
                cols={cols}
                rowHeight={rowHeight}
                width={width}
                draggableHandle=".drag-handle"
                isDraggable={isEditable}
                isResizable={isEditable}
                onLayoutChange={handleLayoutChange}
                margin={GRID_MARGIN}
                useCSSTransforms={true}
                compactType={null}
                preventCollision={false}
            >
                {items.map((item) => (
                    <div
                        key={item.id}
                        data-grid={{
                            i: item.id,
                            w: item.defaultLayout.w,
                            h: item.defaultLayout.h,
                            x: item.defaultLayout.x,
                            y: item.defaultLayout.y,
                            minW: item.defaultLayout.minW,
                            minH: item.defaultLayout.minH,
                        }}
                    >
                        {item.content}
                    </div>
                ))}
            </Responsive>
        </div>
    );
});
DraggableGrid.displayName = 'DraggableGrid';
