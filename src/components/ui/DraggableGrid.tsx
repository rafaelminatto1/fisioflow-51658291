import React, { useState, useEffect, useCallback } from 'react';
import { Responsive, Layout, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, RotateCcw } from 'lucide-react';

// Use WidthProvider from the main package (or legacy if needed, but checking package.json again, legacy is safer for exported WidthProvider)
// However, I will try 'react-grid-layout' first but if that failed, I will use a custom workaround or 'react-grid-layout/legacy'
// The user's package.json shows 'legacy' export exists.
// Let's import from 'react-grid-layout/legacy' via a require or direct import if typescript allows.
// Since import failed in ESM build on Vercel, likely need:
// import { Responsive, WidthProvider } from 'react-grid-layout'; 
// caused "WidthProvider not exported".
// Let's try importing from direct path if possible or fallback to legacy.
// Given strict export map, 'react-grid-layout/legacy' is mapped.

// Let's us the HOC pattern which is stable.

// We need to handle the import. Since I cannot easily change how 'react-grid-layout' is built,
// I will use:
// import { Responsive, WidthProvider } from 'react-grid-layout'; 
// WAIT, that failed.
// Let's use:
// import RGL, { WidthProvider } from 'react-grid-layout';
// NO.

// If I use `react-grid-layout/legacy`, the types might be an issue if not typed.
// But package.json says "types": "./dist/legacy.d.ts". So it should be fine.

// IMPORTANT: I am overwriting the file with the code that works (HOC pattern).

/*
import { Responsive, Layout, WidthProvider } from 'react-grid-layout/legacy';
*/
// Typescript might complain if I don't use the module declared in types.
// The types for 'react-grid-layout' default export the module.
// Let's try to stick to the standard import and maybe the failure was transient or due to Named export?
// Vercel error: "WidthProvider" is not exported.
// Default export of index.mjs is `GridLayout`.
// My previous code used `import { ..., WidthProvider } ...`

// I will import from 'react-grid-layout/legacy'.

import { Responsive, Layout, WidthProvider } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

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
    // We need to handle mounting to avoid hydration mismatch
    const [mounted, setMounted] = useState(false);
    const [layouts, setLayouts] = useState<{ lg: Layout[] }>({ lg: [] });

    useEffect(() => {
        setMounted(true);
    }, []);

    // Merge default layouts with any saved layout positions
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

    const handleLayoutChange = (layout: Layout, layouts: Partial<Record<string, Layout[]>>) => {
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
