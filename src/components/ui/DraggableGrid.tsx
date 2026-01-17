import React, { useState, useEffect, memo, useCallback, useRef } from 'react';
import { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { cn } from '@/lib/utils';

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
    layouts?: ReactGridLayout.Layouts;
}

// Configuration constants for the responsive grid layout
const GRID_CONFIG = {
    cols: { lg: 12, md: 12, sm: 6, xs: 4, xxs: 1 } as const,
    breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const,
    margin: [16, 16] as const, // [horizontal, vertical] margin between items
    rowHeight: 50, // default height of each grid row in pixels
    compactType: 'vertical' as const, // vertical compacting - pushes items down to fill gaps
    containerPadding: [0, 0] as const, // No extra padding at container edges
    // Enhanced UX: Animation and transition settings
    transitionDuration: 150, // ms - faster animation for more responsive feel
    dragThreshold: 0, // pixels - 0 for instant drag response
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
    layouts,
}: DraggableGridProps) {
    const [isMounted, setIsMounted] = useState(false);
    const { containerRef, width } = useContainerWidth();
    const dragCounterRef = useRef(0);

    // Wait for mount to ensure container dimensions are measured
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleLayoutChange = useCallback((currentLayout: Layout) => {
        if (onLayoutChange) {
            onLayoutChange(currentLayout);
        }
    }, [onLayoutChange]);

    const handleDragStart = useCallback(() => {
        dragCounterRef.current += 1;
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    }, []);

    const handleDragEnd = useCallback(() => {
        dragCounterRef.current -= 1;
        if (dragCounterRef.current <= 0) {
            dragCounterRef.current = 0;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    }, []);

    // Attach drag event listeners to body for better UX
    useEffect(() => {
        if (isEditable) {
            document.addEventListener('dragend', handleDragEnd);
            return () => {
                document.removeEventListener('dragend', handleDragEnd);
            };
        }
    }, [isEditable, handleDragEnd]);

    // Don't render until mounted to prevent layout shifts
    if (!isMounted) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className={cn("w-full", className)}
            style={{ position: 'relative' }}
        >
            <Responsive
                className={cn("layout", isEditable && "editable")}
                breakpoints={GRID_CONFIG.breakpoints}
                cols={cols}
                rowHeight={rowHeight}
                width={width}
                draggableHandle=".drag-handle"
                isDraggable={isEditable}
                isResizable={isEditable}
                onLayoutChange={handleLayoutChange}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                margin={GRID_CONFIG.margin}
                containerPadding={GRID_CONFIG.containerPadding}
                useCSSTransforms={true}
                compactType={GRID_CONFIG.compactType}
                preventCollision={false} // Allow compacting to prevent overlaps
                // Enhanced UX: Smooth animations
                transformScale={1}
                transitionDuration={GRID_CONFIG.transitionDuration}
                // Bounding box for dragging
                boundingBox={[]} // No bounds - allow free movement
                // Allow items to be dragged more freely
                autoSize={true}
                layouts={layouts}
                resizeHandles={['se']} // Standard bottom-right resize handle
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
                            maxW: item.defaultLayout.w ? item.defaultLayout.w + 4 : undefined, // Allow slight expansion
                        }}
                        style={{ overflow: 'visible' }} // Allow shadows and tooltips to overflow
                    >
                        {item.content}
                    </div>
                ))}
            </Responsive>
        </div>
    );
});

DraggableGrid.displayName = 'DraggableGrid';
