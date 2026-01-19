import { Draggable } from '@hello-pangea/dnd';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, MoreHorizontal, Pencil, Trash2, User, CheckSquare, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tarefa, PRIORIDADE_LABELS, PRIORIDADE_COLORS } from '@/hooks/useTarefas';

interface KanbanCardProps {
  tarefa: Tarefa;
  index: number;
  onEdit: (tarefa: Tarefa) => void;
  onDelete: (id: string) => void;
}

export function KanbanCard({ tarefa, index, onEdit, onDelete }: KanbanCardProps) {
  const isOverdue = tarefa.data_vencimento && isPast(new Date(tarefa.data_vencimento)) && tarefa.status !== 'CONCLUIDO';
  const isDueToday = tarefa.data_vencimento && isToday(new Date(tarefa.data_vencimento));

  return (
    <Draggable draggableId={tarefa.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'group rounded-xl border bg-card p-4 shadow-sm transition-all duration-200',
            'hover:shadow-md hover:border-primary/30',
            snapshot.isDragging && 'shadow-lg rotate-2 scale-105 border-primary'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <h4 className="font-medium text-sm leading-tight line-clamp-2 flex-1">
              {tarefa.titulo}
            </h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(tarefa)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(tarefa.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Description */}
          {tarefa.descricao && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {tarefa.descricao}
            </p>
          )}

          {/* Tags */}
          {tarefa.tags && tarefa.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {tarefa.tags.slice(0, 3).map((tag, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  {tag}
                </Badge>
              ))}
              {tarefa.tags.length > 3 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  +{tarefa.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              {/* Priority */}
              <Badge
                variant="secondary"
                className={cn('text-[10px] px-1.5 py-0', PRIORIDADE_COLORS[tarefa.prioridade])}
              >
                {PRIORIDADE_LABELS[tarefa.prioridade]}
              </Badge>

              {/* Date Range or Due Date */}
              {(tarefa.data_vencimento || tarefa.start_date) && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-[10px]',
                    isOverdue && 'text-red-400',
                    isDueToday && !isOverdue && 'text-orange-400',
                    !isOverdue && !isDueToday && 'text-muted-foreground'
                  )}
                >
                  {isOverdue ? <Clock className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                  <span>
                    {tarefa.start_date && format(new Date(tarefa.start_date), 'dd/MM')}
                    {tarefa.start_date && tarefa.data_vencimento && ' - '}
                    {tarefa.data_vencimento && format(new Date(tarefa.data_vencimento), 'dd/MM')}
                  </span>
                </div>
              )}

              {/* Checklist & Attachments Indicators */}
              {((tarefa.checklist && tarefa.checklist.length > 0) || (tarefa.attachments && tarefa.attachments.length > 0)) && (
                <div className="flex items-center gap-2 border-l border-border/50 pl-2 ml-1">
                  {tarefa.checklist && tarefa.checklist.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Checklist">
                      <CheckSquare className="h-3 w-3" />
                      <span>
                        {tarefa.checklist.filter(i => i.completed).length}/{tarefa.checklist.length}
                      </span>
                    </div>
                  )}
                  {tarefa.attachments && tarefa.attachments.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Anexos">
                      <LinkIcon className="h-3 w-3" />
                      <span>{tarefa.attachments.length}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assignee */}
            {tarefa.responsavel ? (
              <Avatar className="h-6 w-6">
                <AvatarImage src={tarefa.responsavel.avatar_url} />
                <AvatarFallback className="text-[10px]">
                  {tarefa.responsavel.full_name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <User className="h-3 w-3 text-muted-foreground/50" />
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
