import React from 'react';
import { List } from 'react-window';
import AutoSizer from 'react-virtualized/dist/es/AutoSizer';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Eye, 
  Copy, 
  Archive,
  Flag,
  Calendar,
  Paperclip,
  MessageSquare,
  Link2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Tarefa } from '@/types/tarefas';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PRIORIDADE_LABELS, PRIORIDADE_COLORS, STATUS_LABELS, STATUS_COLORS } from '@/types/tarefas';

interface TaskTableVirtualizedProps {
  tasks: Tarefa[];
  selectedTasks: Set<string>;
  toggleTaskSelection: (id: string) => void;
  onViewTask: (tarefa: Tarefa) => void;
  onEditTask: (tarefa: Tarefa) => void;
  onDeleteTask: (id: string) => void;
  onDuplicateTask: (tarefa: Tarefa) => void;
  onArchiveTask: (id: string) => void;
  onBulkActions?: () => void;
}

interface TaskRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    task: Tarefa;
    isSelected: boolean;
    toggleTaskSelection: (id: string) => void;
    onViewTask: (tarefa: Tarefa) => void;
    onEditTask: (tarefa: Tarefa) => void;
    onDeleteTask: (id: string) => void;
    onDuplicateTask: (tarefa: Tarefa) => void;
    onArchiveTask: (id: string) => void;
  };
}

const TaskRow: React.FC<TaskRowProps> = ({ index, style, data }) => {
  const { task, isSelected, toggleTaskSelection, onViewTask, onEditTask, onDeleteTask, onDuplicateTask, onArchiveTask } = data;
  
  const isOverdue = task.data_vencimento && 
    isPast(new Date(task.data_vencimento)) && 
    task.status !== 'CONCLUIDO';
  
  const isDueToday = task.data_vencimento && isToday(new Date(task.data_vencimento));
  
  const checklistProgress = (() => {
    if (!task.checklists?.length) return null;
    const total = task.checklists.reduce((acc, cl) => acc + cl.items.length, 0);
    const done = task.checklists.reduce((acc, cl) => acc + cl.items.filter(i => i.completed).length, 0);
    return total > 0 ? Math.round((done / total) * 100) : null;
  })();

  return (
    <TableRow 
      key={task.id}
      style={style}
      className={cn(
        'cursor-pointer border-b border-border/50 hover:bg-muted/50',
        isSelected && 'bg-primary/10'
      )}
      onClick={() => onViewTask(task)}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleTaskSelection(task.id)}
        />
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        {checklistProgress !== null && (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {checklistProgress}%
            </span>
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium line-clamp-1">{task.titulo}</span>
          {task.tags && task.tags.length > 0 && (
            <div className="flex gap-1 mt-1">
              {task.tags.slice(0, 2).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 2 && (
                <span className="text-[10px] text-muted-foreground">
                  +{task.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge className={cn('text-xs', STATUS_COLORS[task.status].bg, STATUS_COLORS[task.status].text)}>
          {STATUS_LABELS[task.status]}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge 
          variant="outline"
          className={cn('text-xs', PRIORIDADE_COLORS[task.prioridade].bg, PRIORIDADE_COLORS[task.prioridade].text)}
        >
          <Flag className="h-3 w-3 mr-0.5" />
          {PRIORIDADE_LABELS[task.prioridade]}
        </Badge>
      </TableCell>
      <TableCell>
        {task.data_vencimento ? (
          <div className={cn(
            'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded',
            isOverdue && 'bg-red-500/20 text-red-500',
            isDueToday && !isOverdue && 'bg-orange-500/20 text-orange-500',
            !isOverdue && !isDueToday && 'text-muted-foreground'
          )}>
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(task.data_vencimento), 'dd/MM', { locale: ptBR })}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">Sem data</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-4">
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              <span>{task.attachments.length}</span>
            </div>
          )}
          
          {task.references && task.references.length > 0 && (
            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Link2 className="h-3 w-3" />
              <span>{task.references.length}</span>
            </div>
          )}
          
          {task.comment_count && task.comment_count > 0 && (
            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>{task.comment_count}</span>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex -space-x-1">
          {task.assignees && task.assignees.length > 0 ? (
            <>
              {task.assignees.slice(0, 3).map((assignee) => (
                <Tooltip key={assignee.id}>
                  <TooltipTrigger>
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={assignee.avatar_url} />
                      <AvatarFallback className="text-[10px]">
                        {assignee.full_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{assignee.full_name}</TooltipContent>
                </Tooltip>
              ))}
              {task.assignees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px]">
                  +{task.assignees.length - 3}
                </div>
              )}
            </>
          ) : task.responsavel ? (
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={task.responsavel.avatar_url} />
                  <AvatarFallback className="text-[10px]">
                    {task.responsavel.full_name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{task.responsavel.full_name}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <Eye className="h-3 w-3 text-muted-foreground/50" />
            </div>
          )}
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewTask(task)}>
              <Eye className="h-4 w-4 mr-2" />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditTask(task)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            {onDuplicateTask && (
              <DropdownMenuItem onClick={() => onDuplicateTask(task)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onArchiveTask && (
              <DropdownMenuItem onClick={() => onArchiveTask(task.id)}>
                <Archive className="h-4 w-4 mr-2" />
                Arquivar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => onDeleteTask(task.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export const TaskTableVirtualized: React.FC<TaskTableVirtualizedProps> = ({
  tasks,
  selectedTasks,
  toggleTaskSelection,
  onViewTask,
  onEditTask,
  onDeleteTask,
  onDuplicateTask,
  onArchiveTask,
  onBulkActions
}) => {
  const rowHeight = 60; // Aproximate height of each row
  const overscanCount = 5; // Number of extra rows to render outside viewport
  
  const rowData = {
    toggleTaskSelection,
    onViewTask,
    onEditTask,
    onDeleteTask,
    onDuplicateTask,
    onArchiveTask,
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <AutoSizer>
        {({ width, height }) => (
          <List
            width={width}
            height={height}
            itemCount={tasks.length}
            itemSize={rowHeight}
            overscanCount={overscanCount}
            itemData={tasks.map(task => ({
              task,
              isSelected: selectedTasks.has(task.id),
              ...rowData
            }))}
          >
            {TaskRow}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};