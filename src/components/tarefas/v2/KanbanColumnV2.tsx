import { Droppable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, Settings, Trash2, Archive, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { KanbanCardV2, KanbanCardContent } from './KanbanCardV2';
import {
  Tarefa,
  TarefaStatus,
  STATUS_LABELS,
  STATUS_COLORS
} from '@/types/tarefas';
import { memo } from 'react';

interface KanbanColumnV2Props {
  status: TarefaStatus;
  tarefas: Tarefa[];
  wipLimit?: number;
  onAddTask: (status: TarefaStatus) => void;
  onEditTask: (tarefa: Tarefa) => void;
  onViewTask: (tarefa: Tarefa) => void;
  onDeleteTask: (id: string) => void;
  onDuplicateTask?: (tarefa: Tarefa) => void;
  onArchiveTask?: (id: string) => void;
  onColumnSettings?: (status: TarefaStatus) => void;
  onArchiveAll?: (status: TarefaStatus) => void;
}

export const KanbanColumnV2 = memo(function KanbanColumnV2({
  status,
  tarefas,
  wipLimit,
  onAddTask,
  onEditTask,
  onViewTask,
  onDeleteTask,
  onDuplicateTask,
  onArchiveTask,
  onColumnSettings,
  onArchiveAll
}: KanbanColumnV2Props) {
  const colors = STATUS_COLORS[status];
  const isOverWipLimit = wipLimit && tarefas.length > wipLimit;
  const isAtWipLimit = wipLimit && tarefas.length === wipLimit;

  return (
    <div className={cn(
      'flex flex-col w-[320px] min-w-[320px] bg-muted/30 rounded-2xl transition-all duration-200',
      isOverWipLimit && 'ring-2 ring-red-500/50'
    )}>
      {/* Column Header */}
      <div className={cn('p-4 rounded-t-2xl', colors.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('h-3 w-3 rounded-full', colors.dot)} />
            <h3 className="font-semibold text-sm">{STATUS_LABELS[status]}</h3>
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    isOverWipLimit && 'bg-red-500/20 text-red-500',
                    isAtWipLimit && !isOverWipLimit && 'bg-yellow-500/20 text-yellow-500'
                  )}
                >
                  {tarefas.length}{wipLimit ? `/${wipLimit}` : ''}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {isOverWipLimit
                  ? `Limite WIP excedido! (${tarefas.length}/${wipLimit})`
                  : isAtWipLimit
                    ? 'Limite WIP atingido'
                    : `${tarefas.length} tarefa(s)`
                }
              </TooltipContent>
            </Tooltip>
            {isOverWipLimit && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onAddTask(status)}
            >
              <Plus className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAddTask(status)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Tarefa
                </DropdownMenuItem>
                {onColumnSettings && (
                  <DropdownMenuItem onClick={() => onColumnSettings(status)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                )}
                {onArchiveAll && tarefas.length > 0 && status === 'CONCLUIDO' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onArchiveAll(status)}>
                      <Archive className="h-4 w-4 mr-2" />
                      Arquivar Concluídas
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Droppable Area */}
      <Droppable
        droppableId={status}
        getContainerForClone={() => document.body}
        renderClone={(provided, _snapshot, rubric) => {
          const tarefa = tarefas.find((t) => t.id === rubric.draggableId);
          if (!tarefa) return null;
          return (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              style={provided.draggableProps.style}
              className="rounded-xl shadow-2xl border-2 border-primary bg-card opacity-95 cursor-grabbing ring-2 ring-primary/20 overflow-hidden w-[304px]"
            >
              <KanbanCardContent tarefa={tarefa} variant="ghost" />
            </div>
          );
        }}
      >
        {(provided, snapshot) => (
          <ScrollArea className="flex-1 h-[calc(100vh-300px)]">
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                'p-3 space-y-3 min-h-[200px] transition-colors duration-200',
                snapshot.isDraggingOver && 'bg-primary/5'
              )}
            >
              {tarefas.map((tarefa, index) => (
                <KanbanCardV2
                  key={tarefa.id}
                  tarefa={tarefa}
                  index={index}
                  onEdit={onEditTask}
                  onView={onViewTask}
                  onDelete={onDeleteTask}
                  onDuplicate={onDuplicateTask}
                  onArchive={onArchiveTask}
                />
              ))}
              {provided.placeholder}

              {/* Empty State */}
              {tarefas.length === 0 && !snapshot.isDraggingOver && (
                <div
                  className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-muted-foreground/20 rounded-xl cursor-pointer hover:border-primary/30 hover:bg-muted/50 transition-colors"
                  onClick={() => onAddTask(status)}
                >
                  <Plus className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Adicionar tarefa</p>
                </div>
              )}

              {/* Drop Indicator when dragging over empty column */}
              {tarefas.length === 0 && snapshot.isDraggingOver && (
                <div className="h-24 border-2 border-dashed border-primary/50 rounded-xl bg-primary/5 flex items-center justify-center">
                  <p className="text-sm text-primary">Solte aqui</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </Droppable>

      {/* Quick Add Button at Bottom */}
      <div className="p-3 pt-0">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => onAddTask(status)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar tarefa
        </Button>
      </div>
    </div>
  );
});
