/**
 * EvolutionResponsiveLayout - Layout responsivo para página de evolução
 *
 * Otimizado para:
 * - Mobile (< 768px)
 * - Tablet (768px - 1024px)
 * - Desktop (>= 1024px)
 */

import { cn } from '@/lib/utils';
import { memo, type ReactNode } from 'react';

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
 * Layout responsivo para página de evolução.
 * Usa a rolagem natural da página sem barras de rolagem internas.
 */
export const EvolutionResponsiveLayout = memo(function EvolutionResponsiveLayout({
  topSection,
  mainGrid,
  alertsSection,
  className,
}: EvolutionResponsiveLayoutProps) {
  return (
    <div className={cn('flex flex-col gap-4 w-full', className)}>
      {/* Seção de alertas - sempre no topo */}
      {alertsSection && <div className="space-y-3">{alertsSection}</div>}

      {/* Cards superiores - layout responsivo */}
      <div>{topSection}</div>

      {/* Grid principal - sem restrições de altura */}
      <div>{mainGrid}</div>
    </div>
  );
});

/**
 * Grid de cards responsivo.
 * Mobile: 1 coluna → Tablet: 2 colunas → Desktop: 3 colunas
 */
export const CardGrid = memo(function CardGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        // Mobile: 1 coluna
        'grid grid-cols-1 gap-3',
        // Small tablets+: 2 colunas
        'sm:grid-cols-2 sm:gap-4',
        // Desktop+: 3 colunas
        'lg:grid-cols-3 lg:gap-4',
        className
      )}
    >
      {children}
    </div>
  );
});

/**
 * Container simples para o grid de evolução.
 * Sem restrições de altura para usar a rolagem natural da página.
 */
export function EvolutionGridContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
