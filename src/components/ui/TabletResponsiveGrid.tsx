/**
 * TabletResponsiveGrid - A responsive grid layout optimized for tablets/iPad and notebooks
 *
 * Features:
 * - Adaptive breakpoints for iPad (10.5", 11", 12.9") and notebooks
 * - Horizontal scroll for small screens instead of stacking
 * - Collapsible panels for content organization
 * - Touch-optimized drag handles for tablets
 */

import React, { useState, useEffect, memo, useCallback, useRef, useMemo } from 'react';
import { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { cn } from '@/lib/utils';
import { ResponsiveReactGridLayout as Responsive } from 'react-grid-layout/dist/legacy';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChevronLeft, ChevronRight, Monitor, Tablet } from 'lucide-react';

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
    category?: 'main' | 'secondary' | 'tertiary';
}

interface TabletResponsiveGridProps {
    items: GridItem[];
    onLayoutChange?: (layout: Layout[]) => void;
    className?: string;
    rowHeight?: number;
    isEditable?: boolean;
    layouts?: ReactGridLayout.Layouts;
}

// Device-specific breakpoints optimized for tablets and notebooks
const TABLET_GRID_CONFIG = {
    // - xxs (0-480px): 1 column - phones
    // - xs (480-600px): 2 columns - large phones
    // - sm (600-768px): 4 columns - small tablets (iPad Mini portrait)
    // - md (768-1024px): 6 columns - tablets (iPad 10.5" portrait)
    // - lg (1024-1280px): 8 columns - large tablets (iPad 12.9" portrait) / small notebooks
    // - xl (1280px+): 12 columns - desktops / large notebooks
    cols: {
        xl: 12,
        lg: 8,
        md: 6,
        sm: 4,
        xs: 2,
        xxs: 1
    } as const,
    breakpoints: {
        xl: 1280,
        lg: 1024,
        md: 768,
        sm: 600,
        xs: 480,
        xxs: 0
    } as const,
    margin: [10, 10] as const,
    rowHeight: 50,
    compactType: 'vertical' as const,
    containerPadding: [0, 0] as const,
    transitionDuration: 200,
    dragThreshold: 0,
} as const;

/**
 * Hook to measure and track the container width
 */
const useContainerWidth = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth;
        }
        return 1280;
    });

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const measureWidth = () => {
            if (element.offsetWidth > 0) {
                setWidth(element.offsetWidth);
            }
        };

        measureWidth();
        requestAnimationFrame(measureWidth);

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) {
                    setWidth(entry.contentRect.width);
                }
            }
        });

        resizeObserver.observe(element);
        return () => resizeObserver.disconnect();
    }, []);

    return { containerRef, width };
};

/**
 * ResizableSplitView - Split panel layout for tablet/desktop
 */
interface ResizableSplitViewProps {
    left: React.ReactNode;
    right: React.ReactNode;
    defaultLeftSize?: number;
    minLeftSize?: number;
    minRightSize?: number;
    className?: string;
    direction?: 'horizontal' | 'vertical';
}

export const ResizableSplitView = memo(function ResizableSplitView({
    left,
    right,
    defaultLeftSize = 50,
    minLeftSize = 30,
    minRightSize = 30,
    className,
    direction = 'horizontal'
}: ResizableSplitViewProps) {
    // Detect screen size for responsive behavior
    const [isSmallScreen, setIsSmallScreen] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsSmallScreen(window.innerWidth < 1024);
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    if (isSmallScreen) {
        return (
            <div className={cn("flex flex-col gap-4", className)}>
                <div className="flex-1">{left}</div>
                <div className="flex-1">{right}</div>
            </div>
        );
    }

    return (
        <ResizablePanelGroup
            direction={direction}
            className={cn("h-full rounded-lg border", className)}
        >
            <ResizablePanel defaultSize={defaultLeftSize} minSize={minLeftSize}>
                <ScrollArea className="h-full">
                    {left}
                </ScrollArea>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel minSize={minRightSize}>
                <ScrollArea className="h-full">
                    {right}
                </ScrollArea>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
});

/**
 * TabletResponsiveGrid - Main responsive grid component
 */
export const TabletResponsiveGrid = memo(function TabletResponsiveGrid({
    items,
    onLayoutChange,
    className,
    rowHeight = TABLET_GRID_CONFIG.rowHeight,
    cols = TABLET_GRID_CONFIG.cols,
    isEditable = false,
    layouts,
}: TabletResponsiveGridProps) {
    const [isMounted, setIsMounted] = useState(false);
    const { containerRef, width } = useContainerWidth();
    const dragCounterRef = useRef(0);
    const effectiveWidth = containerRef.current?.getBoundingClientRect().width ?? width;
    const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

    useEffect(() => {
        setIsMounted(true);

        const updateDeviceType = () => {
            const w = window.innerWidth;
            if (w < 768) setDeviceType('mobile');
            else if (w < 1280) setDeviceType('tablet');
            else setDeviceType('desktop');
        };

        updateDeviceType();
        window.addEventListener('resize', updateDeviceType);
        return () => window.removeEventListener('resize', updateDeviceType);
    }, []);

    const handleLayoutChange = useCallback((currentLayout: Layout[]) => {
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

    useEffect(() => {
        if (isEditable) {
            document.addEventListener('dragend', handleDragEnd);
            return () => {
                document.removeEventListener('dragend', handleDragEnd);
            };
        }
    }, [isEditable, handleDragEnd]);

    // Generate layouts for different breakpoints
    const computedLayouts = useMemo(() => {
        if (layouts) return layouts;

        const xlLayout = items.map(item => ({
            i: item.id,
            ...item.defaultLayout
        }));

        const generateLayout = (columns: number) =>
            items.map((item, index) => {
                const w = Math.min(item.defaultLayout.w, columns);
                return {
                    i: item.id,
                    x: (index % Math.ceil(columns / w)) * w,
                    y: Math.floor(index / Math.ceil(columns / w)) * item.defaultLayout.h,
                    w,
                    h: item.defaultLayout.h,
                    minW: Math.min(item.defaultLayout.minW || 1, columns),
                    minH: item.defaultLayout.minH || 1,
                };
            });

        return {
            xl: xlLayout,
            lg: generateLayout(8),
            md: generateLayout(6),
            sm: generateLayout(4),
            xs: items.map((item, index) => ({
                i: item.id,
                x: 0,
                y: index * 6,
                w: 2,
                h: Math.min(item.defaultLayout.h, 6),
                minW: 2,
                minH: 3,
            })),
            xxs: items.map((item, index) => ({
                i: item.id,
                x: 0,
                y: index * 6,
                w: 1,
                h: Math.min(item.defaultLayout.h, 6),
                minW: 1,
                minH: 3,
            })),
        };
    }, [items, layouts]);

    if (!isMounted) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-muted-foreground">Carregando layout...</div>
            </div>
        );
    }

    // For very small screens, use horizontal scroll instead of grid
    if (width < 600) {
        return (
            <div className={cn("overflow-x-auto", className)}>
                <div className="flex gap-4 min-w-max p-2">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="w-[85vw] max-w-[350px] flex-shrink-0"
                        >
                            {item.content}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn("w-full max-w-full", className)}
            style={{ position: 'relative', overflow: 'visible' }}
        >
            {/* Device indicator for development */}
            {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-2 right-2 z-50 flex items-center gap-2 bg-background/80 backdrop-blur px-3 py-1 rounded-full text-xs text-muted-foreground border">
                    {deviceType === 'mobile' && <Tablet className="h-3 w-3" />}
                    {deviceType === 'tablet' && <Tablet className="h-3 w-3" />}
                    {deviceType === 'desktop' && <Monitor className="h-3 w-3" />}
                    <span className="font-medium">{deviceType}</span>
                    <span className="text-muted">({width}px)</span>
                </div>
            )}

            <Responsive
                className={cn("layout", isEditable && "editable")}
                breakpoints={TABLET_GRID_CONFIG.breakpoints}
                cols={cols}
                rowHeight={rowHeight}
                width={Math.max(1, effectiveWidth)}
                measureBeforeMount={true}
                draggableHandle=".drag-handle"
                isDraggable={isEditable}
                isResizable={isEditable}
                onLayoutChange={handleLayoutChange}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                margin={TABLET_GRID_CONFIG.margin}
                containerPadding={TABLET_GRID_CONFIG.containerPadding}
                useCSSTransforms={true}
                compactType={TABLET_GRID_CONFIG.compactType}
                preventCollision={false}
                transformScale={1}
                transitionDuration={TABLET_GRID_CONFIG.transitionDuration}
                boundingBox={[]}
                autoSize={true}
                layouts={computedLayouts}
                resizeHandles={['se']}
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
                        }}
                        style={{ overflow: 'visible' }}
                    >
                        {item.content}
                    </div>
                ))}
            </Responsive>
        </div>
    );
});

TabletResponsiveGrid.displayName = 'TabletResponsiveGrid';
