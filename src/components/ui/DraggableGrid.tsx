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
        w: number; // width in grid columns
        h: number; // height in grid rows
        x: number; // horizontal position
        y: number; // vertical position
        minW?: number;
        minH?: number;
    };
}

interface DraggableGridProps {
    items: GridItem[];
    onLayoutChange?: (layout: Layout) => void;
    className?: string;
    rowHeight?: number;
    cols?: { lg: number; md: number; sm: number; xs: number; xxs: number };
    isEditable?: boolean;
}

// Configuration constants for the responsive grid layout
const GRID_CONFIG = {
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 } as const,
    breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const,
    margin: [20, 20] as const, // [horizontal, vertical] margin between items
    rowHeight: 50, // default height of each grid row in pixels
    compactType: null, // disable auto-compaction to preserve layout
} as const;

/**
 * Custom hook to measure and track the container width
 * This ensures the responsive grid calculates item sizes correctly
 */
const useContainerWidth = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(1200); // Default to desktop width

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

        // Initial measurement
        if (element.offsetWidth > 0) {
            setWidth(element.offsetWidth);
        }

        resizeObserver.observe(element);

        return () => resizeObserver.disconnect();
    }, []);

    return { containerRef, width };
};

/**
 * DraggableGrid - A responsive, draggable grid layout component
 *
 * Uses react-grid-layout with data-grid attributes for positioning.
 * Items with the same Y position will appear on the same row.
 *
 * @example
 * <DraggableGrid
 *   items={[
 *     { id: '1', content: <div>Widget 1</div>, defaultLayout: { w: 6, h: 5, x: 0, y: 0 } },
 *     { id: '2', content: <div>Widget 2</div>, defaultLayout: { w: 6, h: 5, x: 6, y: 0 } }
 *   ]}
 *   isEditable={true}
 * />
 */
export const DraggableGrid = memo(function DraggableGrid({
    items,
    onLayoutChange,
    className,
    rowHeight = GRID_CONFIG.rowHeight,
    cols = GRID_CONFIG.cols,
    isEditable = false,
}: DraggableGridProps) {
    const [isMounted, setIsMounted] = useState(false);
    const { containerRef, width } = useContainerWidth();

    // Wait for mount to ensure container dimensions are measured
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleLayoutChange = useCallback((currentLayout: Layout) => {
        if (onLayoutChange) {
            onLayoutChange(currentLayout);
        }
    }, [onLayoutChange]);

    // Don't render until mounted to prevent layout shifts
    if (!isMounted) {
        return null;
    }

    return (
        <div ref={containerRef} className={className} style={{ position: 'relative' }}>
            <Responsive
                className="layout"
                breakpoints={GRID_CONFIG.breakpoints}
                cols={cols}
                rowHeight={rowHeight}
                width={width}
                draggableHandle=".drag-handle"
                isDraggable={isEditable}
                isResizable={isEditable}
                onLayoutChange={handleLayoutChange}
                margin={GRID_CONFIG.margin}
                useCSSTransforms={true}
                compactType={GRID_CONFIG.compactType}
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
