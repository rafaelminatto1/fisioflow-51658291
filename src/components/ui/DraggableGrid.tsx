import React, { useState, useEffect, memo, useCallback } from 'react';
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
}

const DEFAULT_COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 } as const;
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const;
const GRID_MARGIN = [16, 16] as const;

export const DraggableGrid = memo(function DraggableGrid({
    items,
    onLayoutChange,
    savedLayout,
    className,
    rowHeight = 60,
    cols = DEFAULT_COLS,
    isEditable = false,
}: DraggableGridProps) {
    const [layouts, setLayouts] = useState<Partial<Record<string, Layout>>>({});
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        // Create default layouts from items with their current positions
        const defaultLayouts = items.map((item) => ({
            i: item.id,
            ...item.defaultLayout,
        }));

        // If no saved layout exists, use default layouts
        if (!savedLayout || savedLayout.length === 0) {
            setLayouts({ lg: defaultLayouts });
            return;
        }

        // Merge saved layouts with defaults (saved positions override defaults)
        const merged: Layout = defaultLayouts.map(def => {
            const saved = savedLayout.find(l => l.i === def.i);
            return saved ? { ...def, ...saved } : def;
        });

        setLayouts({ lg: merged });
    }, [items, savedLayout]);

    const handleLayoutChange = useCallback((currentLayout: Layout, _allLayouts: Partial<Record<string, Layout>>) => {
        if (onLayoutChange) {
            onLayoutChange(currentLayout);
        }
    }, [onLayoutChange]);

    if (!isMounted) {
        return null;
    }

    return (
        <div className={className} style={{ position: 'relative' }}>
            <Responsive
                className="layout"
                layouts={layouts}
                breakpoints={BREAKPOINTS}
                cols={cols}
                rowHeight={rowHeight}
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
