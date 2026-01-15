import React, { useState, useEffect } from 'react';
import { Responsive, Layout, LayoutItem, useContainerWidth } from 'react-grid-layout';
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
    onLayoutChange?: (layout: Layout) => void;
    savedLayout?: Layout;
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
    const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: false });
    const [layouts, setLayouts] = useState<{ lg: Layout }>({ lg: [] });

    useEffect(() => {
        const defaultLayouts = items.map((item) => ({
            i: item.id,
            ...item.defaultLayout,
        }));

        if (!savedLayout || savedLayout.length === 0) {
            setLayouts({ lg: defaultLayouts });
            return;
        }

        const merged: Layout = defaultLayouts.map(def => {
            const saved = savedLayout.find(l => l.i === def.i);
            return saved ? { ...def, ...saved } : def;
        });

        setLayouts({ lg: merged });
    }, [items, savedLayout]);

    // Type guard to handle both Layout and Layout[] from onLayoutChange
    const handleLayoutChange = (currentLayout: Layout, allLayouts: Record<string, Layout>) => {
        if (onLayoutChange) {
            onLayoutChange(currentLayout);
        }
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className={className} style={{ position: 'relative' }} ref={containerRef}>
            <Responsive
                className="layout"
                layouts={layouts}
                width={width}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={cols}
                rowHeight={rowHeight}
                dragConfig={{
                    handle: ".drag-handle",
                    enabled: isEditable
                }}
                resizeConfig={{
                    enabled: isEditable
                }}
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
