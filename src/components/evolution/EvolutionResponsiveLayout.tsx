/**
 * EvolutionResponsiveLayout - Layout responsivo para página de evolução
 *
 * Otimizado para:
 * - iPad Mini (768x1024)
 * - iPad 10.5" (834x1192)
 * - iPad 11" (834x1194)
 * - iPad Pro 12.9" (1024x1366)
 * - Notebooks (1280x720, 1366x768, 1440x900)
 * - Desktop (1920x1080+)
 */

import { cn } from '@/lib/utils';
import { ReactNode, useRef, useEffect, useState } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';

interface EvolutionResponsiveLayoutProps {
    /** Cards superiores (Resumo, Retorno, Cirurgias, Metas) */
    topSection: ReactNode;
    /** Grid principal de evolução (SOAP, Dor, Exercícios, etc) */
    mainGrid: ReactNode;
    /** Seção de alertas e avisos */
    alertsSection?: ReactNode;
    className?: string;
}

/**
 * Layout responsivo para página de evolução
 *
 * Comportamento por breakpoint:
 * - < 768px (mobile): Cards empilhados, grid com scroll horizontal
 * - 768px - 1024px (tablet): Cards em 2 colunas, grid adaptativo
 * - 1024px - 1280px (iPad Pro/notebook): Cards em 3 colunas
 * - >= 1280px (desktop): Layout completo
 */
export function EvolutionResponsiveLayout({
    topSection,
    mainGrid,
    alertsSection,
    className
}: EvolutionResponsiveLayoutProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
    const isNotebook = useMediaQuery('(min-width: 1024px) and (max-width: 1280px)');

    // Medir o container para ajustes dinâmicos
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            className={cn(
                "flex flex-col gap-4 w-full",
                isMobile && "gap-3",
                className
            )}
        >
            {/* Seção de alertas - sempre no topo */}
            {alertsSection && (
                <div className="order-1">
                    {alertsSection}
                </div>
            )}

            {/* Cards superiores - layout responsivo */}
            <div className="order-2">
                {topSection}
            </div>

            {/* Grid principal - com scroll em telas menores */}
            <div
                className={cn(
                    "order-3",
                    // Em mobile, permite scroll horizontal se necessário
                    isMobile && "overflow-x-auto -mx-4 px-4",
                    // Em tablet+, usa scroll vertical dentro do container
                    !isMobile && "overflow-y-auto"
                )}
                style={{
                    // Altura dinâmica baseada no espaço disponível
                    maxHeight: isMobile ? 'none' : 'calc(100vh - 400px)',
                    // Em notebook, ajusta altura considerando header menor
                    minHeight: isNotebook ? '500px' : undefined
                }}
            >
                {mainGrid}
            </div>

            {/* Indicador de tamanho em desenvolvimento */}
            {process.env.NODE_ENV === 'development' && (
                <div className="fixed bottom-4 right-4 bg-background/90 backdrop-blur border rounded-full px-3 py-1 text-xs flex items-center gap-2 shadow-lg z-50">
                    <span className="font-mono">
                        {isMobile ? '📱 M' : isTablet ? '📱 T' : isNotebook ? '💻 N' : '🖥️ D'}
                    </span>
                    <span className="text-muted-foreground">{containerWidth}px</span>
                </div>
            )}
        </div>
    );
}

/**
 * Card responsivo que se adapta ao grid
 */
interface ResponsiveCardProps {
    children: ReactNode;
    className?: string;
    /** Classes específicas para breakpoints */
    mobileClassName?: string;
    tabletClassName?: string;
    desktopClassName?: string;
}

export function ResponsiveCard({
    children,
    className,
    mobileClassName,
    tabletClassName,
    desktopClassName
}: ResponsiveCardProps) {
    return (
        <div
            className={cn(
                "rounded-lg border bg-card",
                // Base styling
                "p-4 sm:p-5 lg:p-6",
                className,
                mobileClassName,
                tabletClassName,
                desktopClassName
            )}
        >
            {children}
        </div>
    );
}

/**
 * Grid de cards otimizado para diferentes telas
 */
interface CardGridProps {
    children: ReactNode;
    className?: string;
}

export function CardGrid({ children, className }: CardGridProps) {
    return (
        <div
            className={cn(
                // Mobile: 1 coluna
                "grid grid-cols-1 gap-3",
                // Small tablets: 2 colunas
                "sm:grid-cols-2 sm:gap-4",
                // Large tablets: 2 colunas com gap maior
                "md:grid-cols-2 md:gap-4",
                // iPad Pro/notebooks: 3 colunas
                "lg:grid-cols-3 lg:gap-4",
                // Desktop: mantém 3 colunas
                "xl:grid-cols-3 xl:gap-5",
                className
            )}
        >
            {children}
        </div>
    );
}

/**
 * Container com altura adaptativa para o grid de evolução
 */
export function EvolutionGridContainer({ children, className }: { children: ReactNode; className?: string }) {
    const isSmallScreen = useMediaQuery('(max-height: 800px)');

    return (
        <div
            className={cn(
                "transition-all duration-200",
                isSmallScreen ? "max-h-[50vh]" : "max-h-[70vh]",
                className
            )}
        >
            {children}
        </div>
    );
}
