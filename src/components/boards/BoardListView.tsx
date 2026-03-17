import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { BoardColumn } from '@/types/boards';
import type { Tarefa } from '@/types/tarefas';
import { PRIORIDADE_COLORS, type TarefaPrioridade } from '@/types/tarefas';

interface BoardListViewProps {
  columns: BoardColumn[];
  tarefas: Tarefa[];
  onAddTask: (columnId: string) => void;
  onViewTask: (tarefa: Tarefa) => void;
}

export function BoardListView({ columns, tarefas, onAddTask, onViewTask }: BoardListViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const sortedCols = [...columns].sort((a, b) => a.order_index - b.order_index);

  const toggle = (id: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      {sortedCols.map(col => {
        const colTasks = tarefas
          .filter(t => t.column_id === col.id)
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        const isCollapsed = collapsed.has(col.id);

        return (
          <div key={col.id} className="rounded-xl overflow-hidden border border-border/50">
            {/* Column header */}
            <div
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none hover:bg-muted/50 transition-colors"
              style={{ backgroundColor: col.color ? `${col.color}40` : undefined }}
              onClick={() => toggle(col.id)}
            >
              {isCollapsed
                ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
              <span className="font-semibold text-sm">{col.name}</span>
              <Badge variant="secondary" className="text-xs ml-1">{colTasks.length}</Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto"
                onClick={e => { e.stopPropagation(); onAddTask(col.id); }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Tasks */}
            {!isCollapsed && (
              <div className="divide-y divide-border/50">
                {colTasks.map(tarefa => (
                  <div
                    key={tarefa.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => onViewTask(tarefa)}
                  >
                    <Circle className={cn('h-3.5 w-3.5 flex-shrink-0', PRIORIDADE_COLORS[tarefa.prioridade as TarefaPrioridade] ?? 'text-muted-foreground')} />
                    <span className="flex-1 text-sm truncate">{tarefa.titulo}</span>
                    {tarefa.data_vencimento && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {format(new Date(tarefa.data_vencimento), 'dd/MM', { locale: ptBR })}
                      </span>
                    )}
                    {tarefa.tags?.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">{tag}</Badge>
                    ))}
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div className="px-4 py-3 text-xs text-muted-foreground">
                    Nenhuma tarefa nesta coluna
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
