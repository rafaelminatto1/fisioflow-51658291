/**
 * ResponsiveGridLayout - Layout responsivo otimizado para iPad e notebooks
 *
 * Características:
 * - Breakpoints específicos para iPad (Mini, 10.5", 11", 12.9") e notebooks
 * - Grid adaptativo que mantém usabilidade em todas as telas
 * - Suporte a orientação retrato/paisagem
 * - Otimizado para touch em tablets
 */

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ResponsiveGridLayoutProps {
    children: ReactNode;
    className?: string;
    /**
     * Número de colunas em diferentes breakpoints
     * @default { xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }
     */
    cols?: {
        xs?: number;  // < 640px
        sm?: number;  // 640px - 768px
        md?: number;  // 768px - 1024px
        lg?: number;  // 1024px - 1280px
        xl?: number;  // >= 1280px
    };
    gap?: string;
}

/**
 * Grid responsivo com breakpoints otimizados para iPad e notebooks
 *
 * @example
 * <ResponsiveGridLayout cols={{ xs: 1, sm: 2, lg: 3 }}>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </ResponsiveGridLayout>
 */
export function ResponsiveGridLayout({
    children,
    className,
    cols = { xs: 1, sm: 2, md: 2, lg: 3, xl: 3 },
    gap = '0.75rem'
}: ResponsiveGridLayoutProps) {
    // Constrói as classes de grid baseado nas colunas especificadas
    const gridCols = cn(
        'grid',
        cols.xs === 1 && 'grid-cols-1',
        cols.xs === 2 && 'grid-cols-2',
        cols.sm === 2 && 'sm:grid-cols-2',
        cols.sm === 3 && 'sm:grid-cols-3',
        cols.md === 2 && 'md:grid-cols-2',
        cols.md === 3 && 'md:grid-cols-3',
        cols.lg === 3 && 'lg:grid-cols-3',
        cols.lg === 4 && 'lg:grid-cols-4',
        cols.xl === 3 && 'xl:grid-cols-3',
        cols.xl === 4 && 'xl:grid-cols-4',
    );

    return (
        <div
            className={cn(gridCols, className)}
            style={{ gap }}
        >
            {children}
        </div>
    );
}

/**
 * CardGrid - Grid responsivo para cards
 * Wrapper simples em torno de ResponsiveGridLayout
 */
export function CardGrid({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <ResponsiveGridLayout
            cols={{ xs: 1, sm: 2, md: 2, lg: 3 }}
            className={className}
        >
            {children}
        </ResponsiveGridLayout>
    );
}

interface ResponsiveCardProps {
    children: ReactNode;
    className?: string;
    /**
     * Define se o card deve ocupar múltiplas colunas/linhas em certos breakpoints
     */
    span?: {
        xs?: 'row' | 'full';
        sm?: 'col-span-2' | 'row-span-2';
        md?: 'col-span-2' | 'row-span-2';
        lg?: 'col-span-2' | 'row-span-2' | 'col-span-3';
        xl?: 'col-span-2' | 'row-span-2' | 'col-span-3' | 'col-span-4';
    };
}

/**
 * Wrapper para cards que precisam ocupar múltiplas posições no grid
 */
export function ResponsiveCard({
    children,
    className,
    span
}: ResponsiveCardProps) {
    return (
        <div
            className={cn(
                span?.xs === 'row' && 'col-span-1 row-span-2',
                span?.xs === 'full' && 'col-span-1',
                span?.sm === 'col-span-2' && 'sm:col-span-2',
                span?.sm === 'row-span-2' && 'sm:row-span-2',
                span?.md === 'col-span-2' && 'md:col-span-2',
                span?.md === 'row-span-2' && 'md:row-span-2',
                span?.lg === 'col-span-2' && 'lg:col-span-2',
                span?.lg === 'col-span-3' && 'lg:col-span-3',
                span?.lg === 'row-span-2' && 'lg:row-span-2',
                span?.xl === 'col-span-2' && 'xl:col-span-2',
                span?.xl === 'col-span-3' && 'xl:col-span-3',
                span?.xl === 'col-span-4' && 'xl:col-span-4',
                span?.xl === 'row-span-2' && 'xl:row-span-2',
                className
            )}
        >
            {children}
        </div>
    );
}

/**
 * Container responsivo para conteúdo principal
 * Adiciona padding apropriado e previne overflow horizontal
 */
export function ResponsiveContainer({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn("w-full overflow-x-hidden", className)}>
            <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">
                {children}
            </div>
        </div>
    );
}

/**
 * Wrapper para conteúdo que precisa de scroll em telas pequenas
 */
export function ScrollableContent({
    children,
    className,
    maxHeight = "60vh"
}: { children: ReactNode; className?: string; maxHeight?: string }) {
    return (
        <div
            className={cn("overflow-auto", className)}
            style={{ maxHeight }}
        >
            {children}
        </div>
    );
}

/**
 * Indicador de dispositivo para desenvolvimento (apenas em dev)
 */
export function DeviceIndicator({ width, height }: { width: number; height: number }) {
    if (process.env.NODE_ENV !== 'development') return null;

    const getDeviceType = () => {
        if (width < 640) return { name: 'Mobile', icon: '📱' };
        if (width < 768) return { name: 'Large Mobile', icon: '📱' };
        if (width < 1024) return { name: 'Tablet', icon: '📱' };
        if (width < 1280) return { name: 'iPad/Notebook', icon: '💻' };
        return { name: 'Desktop', icon: '🖥️' };
    };

    const device = getDeviceType();

    return (
        <div className="fixed top-16 right-4 z-50 bg-background/90 backdrop-blur border rounded-full px-3 py-1 text-xs flex items-center gap-2 shadow-lg">
            <span>{device.icon}</span>
            <span className="font-medium">{device.name}</span>
            <span className="text-muted-foreground">({width}×{height})</span>
        </div>
    );
}

/**
 * Hook para detectar o tipo de dispositivo
 */
export function useDeviceType() {
    if (typeof window === 'undefined') {
        return { isMobile: false, isTablet: false, isDesktop: true, width: 1280 };
    }

    const width = window.innerWidth;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1280;
    const isDesktop = width >= 1280;

    return { isMobile, isTablet, isDesktop, width };
}
