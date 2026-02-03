/**
 * GanttTimelineHeader - Header do timeline com datas
 * Mostra dias/semanas/meses baseado no zoom level
 */

import React from 'react';
import { format, isSameDay, startOfWeek, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import type { TimeCell, GanttZoomLevel } from '@/types/gantt';

interface GanttTimelineHeaderProps {
  cells: TimeCell[];
  zoom: GanttZoomLevel;
  y: number;
}

export function GanttTimelineHeader({ cells, zoom, y }: GanttTimelineHeaderProps) {
  const columnWidth = cells[0]?.width || 60;

  // Agrupar células para header de nível superior
  const getGroups = () => {
    if (zoom === 'month') {
      // Agrupar por semana
      const groups: Array<{ label: string; startIndex: number; count: number }> = [];
      let currentWeekStart: Date | null = null;
      let currentGroup: typeof groups[0] | null = null;

      cells.forEach((cell, index) => {
        const weekStart = startOfWeek(cell.date, { locale: ptBR });

        if (!currentWeekStart || !isSameDay(weekStart, currentWeekStart)) {
          currentWeekStart = weekStart;
          currentGroup = {
            label: format(weekStart, "'Semana' w", { locale: ptBR }),
            startIndex: index,
            count: 0,
          };
          groups.push(currentGroup);
        }

        if (currentGroup) {
          currentGroup.count++;
        }
      });

      return groups;
    }

    return null;
  };

  const groups = getGroups();

  return (
    <g style={{ transform: `translateY(${y}px)` }}>
      {/* Background */}
      <rect
        x={0}
        y={0}
        width={cells.length * columnWidth}
        height={40}
        fill="hsl(var(--muted) / 0.3)"
        className="border-b"
      />

      {/* Grupo de nível superior (quando aplicável) */}
      {groups && groups.map((group) => (
        <g key={group.startIndex}>
          <rect
            x={group.startIndex * columnWidth}
            y={0}
            width={group.count * columnWidth}
            height={20}
            fill="hsl(var(--muted) / 0.5)"
            className="border-r border-b"
          />
          <text
            x={group.startIndex * columnWidth + (group.count * columnWidth) / 2}
            y={14}
            textAnchor="middle"
            className="text-xs font-medium fill-muted-foreground"
          >
            {group.label}
          </text>
        </g>
      ))}

      {/* Células individuais */}
      {cells.map((cell, index) => {
        const x = index * columnWidth;
        const y = groups ? 20 : 0;
        const height = groups ? 20 : 40;

        return (
          <g key={index}>
            {/* Célula */}
            <rect
              x={x}
              y={y}
              width={columnWidth}
              height={height}
              className={cn(
                'border-r',
                cell.is_today && 'bg-primary/10',
                cell.is_weekend && 'bg-muted/30'
              )}
            />

            {/* Dia do mês */}
            <text
              x={x + columnWidth / 2}
              y={y + (groups ? 32 : 14)}
              textAnchor="middle"
              className={cn(
                'text-xs font-medium',
                cell.is_working_day ? 'fill-foreground' : 'fill-muted-foreground',
                cell.is_today && 'fill-primary font-bold'
              )}
            >
              {format(cell.date, 'd')}
            </text>

            {/* Dia da semana (apenas no modo dia) */}
            {zoom === 'day' && (
              <text
                x={x + columnWidth / 2}
                y={y + 34}
                textAnchor="middle"
                className={cn(
                  'text-xs',
                  cell.is_working_day ? 'fill-muted-foreground' : 'fill-muted-foreground/50'
                )}
              >
                {format(cell.date, 'EEE', { locale: ptBR }).slice(0, 3)}
              </text>
            )}
          </g>
        );
      })}

      {/* Linha indicadora de hoje */}
      {cells.some((c) => c.is_today) && (
        <line
          x1={cells.find((c) => c.is_today)?.x || 0}
          y1={0}
          x2={cells.find((c) => c.is_today)?.x || 0}
          y2={cells.length * 50}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeDasharray="4 2"
          className="pointer-events-none"
        />
      )}
    </g>
  );
}

/**
 * Header simples para células individuais
 */
interface SimpleHeaderProps {
  cells: TimeCell[];
  height?: number;
}

export function SimpleTimelineHeader({ cells, height = 40 }: SimpleHeaderProps) {
  const columnWidth = cells[0]?.width || 60;

  return (
    <div
      className="relative border-b bg-muted/30"
      style={{ height, width: cells.length * columnWidth }}
    >
      {cells.map((cell, index) => {
        const x = index * columnWidth;

        return (
          <div
            key={index}
            className={cn(
              'absolute top-0 bottom-0 border-r flex items-center justify-center text-xs',
              cell.is_today && 'bg-primary/10',
              cell.is_weekend && 'bg-muted/30'
            )}
            style={{
              left: x,
              width: columnWidth,
            }}
          >
            <span
              className={cn(
                cell.is_working_day ? 'font-medium' : 'text-muted-foreground',
                cell.is_today && 'text-primary font-bold'
              )}
            >
              {format(cell.date, 'd MMM', { locale: ptBR })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
