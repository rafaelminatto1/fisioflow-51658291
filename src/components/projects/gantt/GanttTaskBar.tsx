/**
 * GanttTaskBar - Barra de tarefa individual para o gráfico Gantt
 * Com suporte a drag, resize e indicação de status
 */

import React, { useId } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { GripVertical, Diamond } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { GanttTask, TaskPosition } from '@/types/gantt';

interface GanttTaskBarProps {
  task: GanttTask;
  position: TaskPosition;
  isDragging?: boolean;
  isCritical?: boolean;
  onClick?: () => void;
}

export function GanttTaskBar({ task, position, isDragging, isCritical, onClick }: GanttTaskBarProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    disabled: false,
  });

  const id = useId();

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  // Cor baseada em status
  const getStatusColor = () => {
    if (task.is_milestone) return 'bg-blue-500';

    if (isCritical) return 'bg-destructive';

    switch (task.status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'on_hold':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-gray-400';
      default:
        return 'bg-primary';
    }
  };

  const statusColor = getStatusColor();

  // Barras de progresso
  const progressWidth = task.progress;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
      }}
      className="group"
    >
      <motion.div
        {...attributes}
        {...listeners}
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        className={cn(
          'relative h-full rounded-md cursor-pointer shadow-sm',
          'transition-all duration-200',
          isDragging && 'opacity-50 shadow-lg'
        )}
      >
        {/* Background */}
        <div
          className={cn(
            'absolute inset-0 rounded-md',
            statusColor,
            task.status === 'in_progress' && 'bg-blue-500/20'
          )}
        />

        {/* Progress Bar */}
        {task.progress > 0 && task.progress < 100 && (
          <div
            className={cn(
              'absolute left-0 top-0 bottom-0 rounded-l-md',
              statusColor
            )}
            style={{ width: `${progressWidth}%` }}
          />
        )}

        {/* Milestone Indicator */}
        {task.is_milestone && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Diamond className="w-4 h-4 text-white fill-white" />
          </div>
        )}

        {/* Task Label */}
        {position.width > 60 && (
          <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
            <span className="text-xs font-medium text-white truncate drop-shadow">
              {task.title}
            </span>
          </div>
        )}

        {/* Drag Handle */}
        <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-l-md" />
        <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-r-md" />

        {/* Resize Handles */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 opacity-0 group-hover:opacity-100">
          <GripVertical className="w-3 h-3 text-white/80" />
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 opacity-0 group-hover:opacity-100">
          <GripVertical className="w-3 h-3 text-white/80" />
        </div>
      </motion.div>

      {/* Tooltip content via data attribute */}
      <div className="sr-only" data-tooltip-content>
        <div className="space-y-1">
          <div className="font-semibold">{task.title}</div>
          {task.description && (
            <div className="text-sm">{task.description}</div>
          )}
          <div className="text-xs text-muted-foreground">
            {format(task.start_date, 'dd/MMM', { locale: ptBR })} - {format(task.end_date, 'dd/MMM', { locale: ptBR })}
          </div>
          {task.assignee_name && (
            <div className="text-xs">Responsável: {task.assignee_name}</div>
          )}
          <div className="text-xs">Progresso: {task.progress}%</div>
        </div>
      </div>
    </div>
  );
}
