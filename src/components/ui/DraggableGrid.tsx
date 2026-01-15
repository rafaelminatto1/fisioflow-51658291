import React, { useState, useEffect } from 'react';
import { Responsive, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

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
    const [layouts, setLayouts] = useState<{ lg: Layout[] }>({ lg: [] });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const defaultLayouts = items.map((item) => ({
            i: item.id,
            ...item.defaultLayout,
        }));

        if (!savedLayout || savedLayout.length === 0) {
            setLayouts({ lg: defaultLayouts });
            return;
        }

        const merged = defaultLayouts.map(def => {
            const saved = savedLayout.find(l => l.i === def.i);
            return saved ? { ...def, ...saved } : def;
        });

        setLayouts({ lg: merged });
    }, [items, savedLayout]);

    // Type guard to handle both Layout and Layout[] from onLayoutChange
    const handleLayoutChange = (currentLayout: Layout | Layout[], allLayouts: Partial<Record<string, Layout[]>>) => {
        const layoutArray = Array.isArray(currentLayout) ? currentLayout : [currentLayout];
        if (onLayoutChange) {
            onLayoutChange(layoutArray);
        }
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className={className} style={{ position: 'relative' }}>
            <Responsive
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={cols}
                rowHeight={rowHeight}
                draggableHandle=".drag-handle"
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
            </Responsive>
        </div>
    );
};
