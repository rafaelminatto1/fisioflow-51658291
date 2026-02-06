/**
 * GanttDependencyLine - Linha de dependência entre tarefas
 * Renderiza setas conectando tarefas relacionadas
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { DependencyType } from '@/types/gantt';

interface GanttDependencyLineProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: DependencyType;
  isCritical?: boolean;
  onClick?: () => void;
}

export function GanttDependencyLine({
  fromX,
  fromY,
  toX,
  toY,
  type,
  isCritical = false,
  onClick,
}: GanttDependencyLineProps) {
  // Calcular pontos da linha curva
  const midX = (fromX + toX) / 2;
  const offset = 10; // Espaço para a linha sair da tarefa

  // Path SVG baseado no tipo de dependência
  const pathD = (() => {
    switch (type) {
      case 'finish_to_start':
        // FS: Linha sai da direita da origem, entra na esquerda do destino
        return `M ${fromX} ${fromY}
                L ${midX} ${fromY}
                L ${midX} ${toY}
                L ${toX - offset} ${toY}`;

      case 'start_to_start':
        // SS: Linha sai da esquerda da origem, entra na esquerda do destino
        return `M ${fromX} ${fromY}
                L ${fromX - offset} ${fromY}
                L ${toX - offset} ${toY}
                L ${toX - offset} ${toY}`;

      case 'finish_to_finish':
        // FF: Linha sai da direita da origem, entra na direita do destino
        return `M ${fromX} ${fromY}
                L ${fromX + offset} ${fromY}
                L ${toX + offset} ${toY}
                L ${toX} ${toY}`;

      case 'start_to_finish':
        // SF: Linha sai da esquerda da origem, entra na direita do destino
        return `M ${fromX} ${fromY}
                L ${fromX - offset} ${fromY}
                L ${toX + offset} ${toY}
                L ${toX} ${toY}`;

      default:
        return `M ${fromX} ${fromY} L ${toX} ${toY}`;
    }
  })();

  // Cor baseada em criticidade
  const strokeColor = isCritical
    ? 'hsl(var(--destructive))'
    : 'hsl(var(--muted-foreground) / 0.5)';

  return (
    <g
      className={cn(
        'dependency-line transition-all duration-200',
        onClick && 'cursor-pointer hover:opacity-80'
      )}
      onClick={onClick}
    >
      {/* Linha principal */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isCritical ? 2 : 1.5}
        strokeDasharray={type === 'start_to_finish' ? '4 4' : undefined}
      />

      {/* Cabeça de seta */}
      <polygon
        points={getArrowPoints(toX, toY)}
        fill={strokeColor}
      />

      {/* Círculo de conexão na origem */}
      <circle
        cx={fromX}
        cy={fromY}
        r={3}
        fill={strokeColor}
      />
    </g>
  );
}

function getArrowPoints(x: number, y: number): string {
  const size = 6;
  // Seta apontando para a esquerda (indicando dependência)
  return `${x},${y} ${x - size},${y - size / 2} ${x - size},${y + size / 2}`;
}

/**
 * Componente para renderizar múltiplas linhas de dependência
 */
interface GanttDependenciesProps {
  dependencies: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    type: DependencyType;
    isCritical?: boolean;
    id: string;
  }>;
  onDependencyClick?: (id: string) => void;
}

export function GanttDependencies({ dependencies, onDependencyClick }: GanttDependenciesProps) {
  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
      {dependencies.map((dep) => (
        <g key={dep.id} className={onDependencyClick ? 'pointer-events-auto' : ''}>
          <GanttDependencyLine
            fromX={dep.from.x}
            fromY={dep.from.y}
            toX={dep.to.x}
            toY={dep.to.y}
            type={dep.type}
            isCritical={dep.isCritical}
            onClick={() => onDependencyClick?.(dep.id)}
          />
        </g>
      ))}
    </svg>
  );
}
