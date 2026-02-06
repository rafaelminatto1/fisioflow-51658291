/**
 * GanttChart - Componente principal de gráfico de Gantt interativo
 * Visualização timeline de tarefas com drag-and-drop e dependências
 */

import React, { useState, useMemo, useCallback } from 'react';
import {

  format,
  startOfDay,
  eachDayOfInterval,
  differenceInDays,
  addDays,
} from 'date-fns';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Settings,
  Maximize2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GanttTaskBar } from './GanttTaskBar';
import { GanttDependencyLine } from './GanttDependencyLine';
import { GanttTimelineHeader } from './GanttTimelineHeader';
import { calculateCriticalPath } from '@/lib/gantt/criticalPath';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import type {
  GanttTask,
  GanttDependency,
  GanttZoomLevel,
  TaskPosition,
  TimeCell,
} from '@/types/gantt';

interface GanttChartProps {
  tasks: GanttTask[];
  dependencies: GanttDependency[];
  onTaskMove?: (taskId: string, newStart: Date, newEnd: Date) => void;
  onTaskResize?: (taskId: string, newStart: Date, newEnd: Date) => void;
  onDependencyClick?: (dependency: GanttDependency) => void;
  onTaskClick?: (task: GanttTask) => void;
  zoom?: GanttZoomLevel;
  onZoomChange?: (zoom: GanttZoomLevel) => void;
  showDependencies?: boolean;
  showCriticalPath?: boolean;
  showWeekends?: boolean;
  workingDays?: number[];
  className?: string;
}

export function GanttChart({
  tasks,
  dependencies,
  onTaskMove,
  _onTaskResize,
  onDependencyClick,
  onTaskClick,
  zoom: controlledZoom,
  onZoomChange,
  showDependencies = true,
  showCriticalPath = false,
  showWeekends = true,
  workingDays = [1, 2, 3, 4, 5],
  className,
}: GanttChartProps) {
  // Estado interno de zoom (não controlado)
  const [internalZoom, setInternalZoom] = useState<GanttZoomLevel>('week');
  const zoom = controlledZoom ?? internalZoom;

  const [viewStart, setViewStart] = useState<Date>(
    () => {
      const minDate = tasks.length > 0
        ? new Date(Math.min(...tasks.map((t) => t.start_date.getTime())))
        : new Date();
      return startOfDay(addDays(minDate, -3));
    }
  );

  const [_activeTask, _setActiveTask] = useState<GanttTask | null>(null);
  const [draggedTask, setDraggedTask] = useState<GanttTask | null>(null);

  // Calcular caminho crítico
  const criticalPath = useMemo(() => {
    if (!showCriticalPath) return null;
    return calculateCriticalPath(tasks, dependencies);
  }, [tasks, dependencies, showCriticalPath]);

  // Calcular células de tempo
  const timeCells = useMemo(() => {
    const days = eachDayOfInterval({
      start: viewStart,
      end: addDays(viewStart, getDaysInView(zoom)),
    });

    const columnWidth = getColumnWidth(zoom);

    return days.map((date, index) => ({
      date,
      is_working_day: workingDays.includes(date.getDay()),
      is_today: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
      is_weekend: date.getDay() === 0 || date.getDay() === 6,
      x: index * columnWidth,
      width: columnWidth,
    } as TimeCell));
  }, [viewStart, zoom, workingDays]);

  // Calcular posições das tarefas
  const taskPositions = useMemo(() => {
    const columnWidth = getColumnWidth(zoom);
    const positions: Record<string, TaskPosition> = {};

    tasks.forEach((task, index) => {
      const startOffset = differenceInDays(task.start_date, viewStart);
      const duration = differenceInDays(task.end_date, task.start_date);

      positions[task.id] = {
        x: startOffset * columnWidth,
        y: index * 50 + 10, // 50px de altura por tarefa
        width: (duration + 1) * columnWidth, // +1 para incluir o dia final
        height: 32,
      };
    });

    return positions;
  }, [tasks, viewStart, zoom]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id as string);
    if (task) {
      setDraggedTask(task);
    }
  }, [tasks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const task = tasks.find((t) => t.id === event.active.id as string);
    if (!task || !onTaskMove) return;

    // Calcular nova posição baseada no drop
    const deltaX = event.delta.x;
    const columnWidth = getColumnWidth(zoom);
    const daysDelta = Math.round(deltaX / columnWidth);

    if (daysDelta !== 0) {
      const duration = differenceInDays(task.end_date, task.start_date);
      const newStart = addDays(task.start_date, daysDelta);
      const newEnd = addDays(newStart, duration);

      onTaskMove(task.id, newStart, newEnd);
    }

    setDraggedTask(null);
  }, [tasks, zoom, onTaskMove]);

  const handleZoomIn = useCallback(() => {
    const levels: GanttZoomLevel[] = ['day', 'week', 'month'];
    const currentIndex = levels.indexOf(zoom);
    if (currentIndex < levels.length - 1) {
      const newZoom = levels[currentIndex + 1];
      setInternalZoom(newZoom);
      onZoomChange?.(newZoom);
    }
  }, [zoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const levels: GanttZoomLevel[] = ['day', 'week', 'month'];
    const currentIndex = levels.indexOf(zoom);
    if (currentIndex > 0) {
      const newZoom = levels[currentIndex - 1];
      setInternalZoom(newZoom);
      onZoomChange?.(newZoom);
    }
  }, [zoom, onZoomChange]);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    const daysToMove = getDaysInView(zoom);
    setViewStart((prev) => {
      const multiplier = direction === 'prev' ? -1 : 1;
      return addDays(prev, daysToMove * multiplier);
    });
  }, [zoom]);

  const handleExport = useCallback(() => {
    try {
      const doc = new jsPDF();
      const margin = 20;

      // Header
      doc.setFontSize(18);
      doc.text('Cronograma do Projeto (Gantt)', margin, 20);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, margin, 28);

      // Table
      autoTable(doc, {
        startY: 35,
        head: [['Tarefa', 'Início', 'Fim', 'Status']],
        body: tasks.map((t) => [
          t.title,
          format(t.start_date, 'dd/MM/yyyy'),
          format(t.end_date, 'dd/MM/yyyy'),
          t.status || 'Pendente'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }, // Primary color
        styles: { fontSize: 9 },
      });

      doc.save(`gantt-chart-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({
        title: 'Sucesso',
        description: 'Gráfico de Gantt exportado para PDF',
      });
    } catch (error) {
      logger.error('Erro ao exportar Gantt para PDF', error, 'GanttChart');
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o PDF',
        variant: 'destructive',
      });
    }
  }, [tasks]);

  // Render
  const totalWidth = timeCells.length * getColumnWidth(zoom);
  const totalHeight = tasks.length * 50 + 40;

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => handleNavigate('prev')}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Navegar para trás</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => handleNavigate('next')}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Navegar para frente</TooltipContent>
              </Tooltip>

              <div className="w-px h-6 bg-border mx-2" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleZoomOut}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Diminuir zoom</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleZoomIn}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Aumentar zoom</TooltipContent>
              </Tooltip>

              <Badge variant="outline" className="ml-2">
                {zoom === 'day' ? 'Dia' : zoom === 'week' ? 'Semana' : 'Mês'}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleExport}>
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar PDF</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Configurações</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tela cheia</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Gantt Canvas */}
          <div className="relative overflow-auto" style={{ maxHeight: '600px' }}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div
                className="relative"
                style={{
                  width: totalWidth,
                  height: totalHeight,
                  minWidth: '100%',
                }}
              >
                {/* Timeline Header */}
                <GanttTimelineHeader
                  cells={timeCells}
                  zoom={zoom}
                  y={0}
                />

                {/* Grid Lines */}
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={totalWidth}
                  height={totalHeight}
                  style={{ top: 40 }}
                >
                  {/* Vertical lines */}
                  {timeCells.map((cell, index) => (
                    <line
                      key={index}
                      x1={cell.x}
                      y1={0}
                      x2={cell.x}
                      y2={totalHeight}
                      stroke={
                        cell.is_today
                          ? 'hsl(var(--primary))'
                          : cell.is_weekend && showWeekends
                          ? 'hsl(var(--muted) / 0.3)'
                          : 'hsl(var(--border))'
                      }
                      strokeWidth={cell.is_today ? 2 : 1}
                      strokeDasharray={
                        cell.is_working_day ? undefined : '4 4'
                      }
                    />
                  ))}

                  {/* Horizontal lines (uma por tarefa) */}
                  {tasks.map((_, index) => (
                    <line
                      key={`h-${index}`}
                      x1={0}
                      y1={index * 50 + 40}
                      x2={totalWidth}
                      y2={index * 50 + 40}
                      stroke="hsl(var(--border))"
                      strokeWidth={1}
                    />
                  ))}
                </svg>

                {/* Dependency Lines */}
                {showDependencies && dependencies.map((dep) => {
                  const fromPos = taskPositions[dep.from_task_id];
                  const toPos = taskPositions[dep.to_task_id];
                  if (!fromPos || !toPos) return null;

                  return (
                    <GanttDependencyLine
                      key={dep.id}
                      fromX={fromPos.x + fromPos.width}
                      fromY={fromPos.y + fromPos.height / 2}
                      toX={toPos.x}
                      toY={toPos.y + toPos.height / 2}
                      type={dep.type}
                      isCritical={criticalPath?.task_ids.includes(dep.from_task_id)}
                      onClick={() => onDependencyClick?.(dep)}
                    />
                  );
                })}

                {/* Task Bars */}
                {tasks.map((task, _index) => {
                  const pos = taskPositions[task.id];
                  if (!pos) return null;

                  const isCritical = criticalPath?.task_ids.includes(task.id);

                  return (
                    <GanttTaskBar
                      key={task.id}
                      task={task}
                      position={pos}
                      isDragging={draggedTask?.id === task.id}
                      isCritical={isCritical}
                      onClick={() => onTaskClick?.(task)}
                    />
                  );
                })}

                {/* Drag Overlay */}
                <DragOverlay>
                  {draggedTask && (
                    <div className="opacity-50">
                      <GanttTaskBar
                        task={draggedTask}
                        position={taskPositions[draggedTask.id] || { x: 0, y: 0, width: 100, height: 32 }}
                        isDragging
                      />
                    </div>
                  )}
                </DragOverlay>
              </div>
            </DndContext>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-primary" />
              <span>Normal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-destructive" />
              <span>Caminho Crítico</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rotate-45 bg-blue-500" />
              <span>Marco</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getColumnWidth(zoom: GanttZoomLevel): number {
  switch (zoom) {
    case 'day':
      return 120; // 120px por dia
    case 'week':
      return 60; // 60px por dia
    case 'month':
      return 20; // 20px por dia
    default:
      return 60;
  }
}

function getDaysInView(zoom: GanttZoomLevel): number {
  switch (zoom) {
    case 'day':
      return 7; // 1 semana
    case 'week':
      return 28; // 4 semanas
    case 'month':
      return 90; // ~3 meses
    default:
      return 28;
  }
}
