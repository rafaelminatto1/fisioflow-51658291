import React, { useState, useEffect, useCallback } from 'react';
import { Responsive, Layout, WidthProvider as RGLWidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, RotateCcw } from 'lucide-react';

const ResponsiveGridLayout = RGLWidthProvider(Responsive);

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
    onLayoutChange?: (layout: Layout[]) => void;
    savedLayout?: Layout[];
    className?: string;
    rowHeight?: number;
    cols?: { lg: number; md: number; sm: number; xs: number; xxs: number };
    isEditable?: boolean;
}

export const DraggableGrid = ({
    items,
    onLayoutChange,
    savedLayout,
    className,
    rowHeight = 60,
    cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    isEditable = false,
}: DraggableGridProps) => {
    const [mounted, setMounted] = useState(false);
    const [currentLayout, setCurrentLayout] = useState<Layout[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Merge default layouts with any saved layout positions
    const getInitialLayouts = useCallback(() => {
        const defaultLayouts = items.map((item) => ({
            i: item.id,
            ...item.defaultLayout,
        }));

        if (!savedLayout || savedLayout.length === 0) return { lg: defaultLayouts };

        const merged = defaultLayouts.map(def => {
            const saved = savedLayout.find(l => l.i === def.i);
            return saved ? { ...def, ...saved } : def;
        });

        return { lg: merged };

    }, [items, savedLayout]);

    // Use initial layout state, but update it if items change or savedLayout changes
    const [layouts, setLayouts] = useState(getInitialLayouts());

    useEffect(() => {
        setLayouts(getInitialLayouts());
    }, [getInitialLayouts]);

    const handleLayoutChange = (layout: Layout[], allLayouts: any) => {
        setCurrentLayout(layout);
        if (onLayoutChange) {
            onLayoutChange(layout);
        }
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className={className} style={{ position: 'relative' }}>
            {isEditable && (
                <div
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        opacity: 0.5
                    }}
                />
            )}
            <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={cols}
                rowHeight={rowHeight}
                draggableHandle=".drag-handle"
                draggableCancel=".no-drag, textarea, input, select, button"
                isDraggable={isEditable}
                isResizable={isEditable}
                onLayoutChange={handleLayoutChange}
                margin={[16, 16]}
            >
                {items.map((item) => (
                    <div key={item.id} data-grid={item.defaultLayout}>
                        {item.content}
                    </div>
                ))}
            </ResponsiveGridLayout>
        </div>
    );
};
