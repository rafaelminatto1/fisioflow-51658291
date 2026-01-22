import { Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/ui/button';
import { ScrollArea } from '@/components/web/ui/scroll-area';
import { KanbanCard } from './KanbanCard';
import { Tarefa, TarefaStatus, STATUS_LABELS } from '@/hooks/useTarefas';

interface KanbanColumnProps {
  status: TarefaStatus;
  tarefas: Tarefa[];
  onAddTask: (status: TarefaStatus) => void;
  onEditTask: (tarefa: Tarefa) => void;
  onDeleteTask: (id: string) => void;
}

const COLUMN_COLORS: Record<TarefaStatus, { header: string; dot: string }> = {
  A_FAZER: { header: 'bg-slate-500/10', dot: 'bg-slate-400' },
  EM_PROGRESSO: { header: 'bg-blue-500/10', dot: 'bg-blue-400' },
  REVISAO: { header: 'bg-purple-500/10', dot: 'bg-purple-400' },
  CONCLUIDO: { header: 'bg-green-500/10', dot: 'bg-green-400' }
};

export function KanbanColumn({ status, tarefas, onAddTask, onEditTask, onDeleteTask }: KanbanColumnProps) {
  const colors = COLUMN_COLORS[status];

  return (
    <div className="flex flex-col w-[320px] min-w-[320px] bg-muted/30 rounded-2xl">
      {/* Column Header */}
      <div className={cn('p-4 rounded-t-2xl', colors.header)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('h-3 w-3 rounded-full', colors.dot)} />
            <h3 className="font-semibold text-sm">{STATUS_LABELS[status]}</h3>
            <span className="text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full">
              {tarefas.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAddTask(status)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <ScrollArea className="flex-1 h-[calc(100vh-280px)]">
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                'p-3 space-y-3 min-h-[200px] transition-colors duration-200',
                snapshot.isDraggingOver && 'bg-primary/5'
              )}
            >
              {tarefas.map((tarefa, index) => (
                <KanbanCard
                  key={tarefa.id}
                  tarefa={tarefa}
                  index={index}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              ))}
              {provided.placeholder}
              
              {/* Empty State */}
              {tarefas.length === 0 && !snapshot.isDraggingOver && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Nenhuma tarefa</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => onAddTask(status)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  );
}
