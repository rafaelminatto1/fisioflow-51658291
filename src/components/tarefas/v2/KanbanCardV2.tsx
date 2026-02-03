import { Draggable } from '@hello-pangea/dnd';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
  CheckSquare,
  Paperclip,
  MessageSquare,
  Link2,
  AlertTriangle,
  Eye,
  Copy,
  Archive,
  Flag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tarefa,
  PRIORIDADE_LABELS,
  PRIORIDADE_COLORS,
  TIPO_LABELS,
  TIPO_COLORS
} from '@/types/tarefas';

interface KanbanCardContentProps {
  tarefa: Tarefa;
  variant?: 'default' | 'ghost';
  onEdit?: (tarefa: Tarefa) => void;
  onDelete?: (id: string) => void;
  onView?: (tarefa: Tarefa) => void;
  onDuplicate?: (tarefa: Tarefa) => void;
  onArchive?: (id: string) => void;
}

function KanbanCardContent({
  tarefa,
  variant = 'default',
  onEdit,
  onDelete,
  onView,
  onDuplicate,
  onArchive
}: KanbanCardContentProps) {
  const isOverdue = tarefa.data_vencimento && isPast(new Date(tarefa.data_vencimento)) && tarefa.status !== 'CONCLUIDO';
  const isDueToday = tarefa.data_vencimento && isToday(new Date(tarefa.data_vencimento));
  const daysUntilDue = tarefa.data_vencimento ? differenceInDays(new Date(tarefa.data_vencimento), new Date()) : null;
  const isDueSoon = daysUntilDue !== null && daysUntilDue > 0 && daysUntilDue <= 3;

  const checklistProgress = (() => {
    if (!tarefa.checklists || tarefa.checklists.length === 0) return null;
    const totalItems = tarefa.checklists.reduce((acc, cl) => acc + cl.items.length, 0);
    const completedItems = tarefa.checklists.reduce((acc, cl) => acc + cl.items.filter(i => i.completed).length, 0);
    return totalItems > 0 ? { completed: completedItems, total: totalItems, percent: (completedItems / totalItems) * 100 } : null;
  })();

  const attachmentCount = (tarefa.attachments?.length || 0);
  const commentCount = tarefa.comment_count || tarefa.comments?.length || 0;
  const referenceCount = tarefa.references?.length || 0;
  const isGhost = variant === 'ghost';

  return (
    <div className={cn(isGhost && 'pointer-events-none')}>
      {/* Cover Image */}
      {tarefa.cover_image && (
        <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${tarefa.cover_image})` }} />
      )}

      {/* Card Color Indicator */}
      {tarefa.color && (
        <div className={cn('h-1.5 w-full', tarefa.color)} />
      )}

      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            {tarefa.tipo && tarefa.tipo !== 'TAREFA' && (
              <Badge
                variant="secondary"
                className={cn('text-[10px] px-1.5 py-0 mb-1.5', TIPO_COLORS[tarefa.tipo])}
              >
                {TIPO_LABELS[tarefa.tipo]}
              </Badge>
            )}

            <h4 className="font-medium text-sm leading-tight line-clamp-2">
              {tarefa.titulo}
            </h4>
          </div>

          {!isGhost && onView && onEdit && onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onView(tarefa)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(tarefa)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {onDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(tarefa)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onArchive && (
                  <DropdownMenuItem onClick={() => onArchive(tarefa.id)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(tarefa.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {tarefa.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {tarefa.descricao}
          </p>
        )}

        {checklistProgress && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <div className="flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                <span>Checklist</span>
              </div>
              <span>{checklistProgress.completed}/{checklistProgress.total}</span>
            </div>
            <Progress value={checklistProgress.percent} className="h-1" />
          </div>
        )}

        {tarefa.tags && tarefa.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tarefa.tags.slice(0, 3).map((tag, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary"
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
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant="secondary"
                  className={cn('text-[10px] px-1.5 py-0', PRIORIDADE_COLORS[tarefa.prioridade])}
                >
                  <Flag className="h-2.5 w-2.5 mr-0.5" />
                  {PRIORIDADE_LABELS[tarefa.prioridade]}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Prioridade: {PRIORIDADE_LABELS[tarefa.prioridade]}</TooltipContent>
            </Tooltip>

            {tarefa.data_vencimento && (
              <Tooltip>
                <TooltipTrigger>
                  <div
                    className={cn(
                      'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded',
                      isOverdue && 'bg-red-500/20 text-red-500',
                      isDueToday && !isOverdue && 'bg-orange-500/20 text-orange-500',
                      isDueSoon && !isDueToday && !isOverdue && 'bg-yellow-500/20 text-yellow-500',
                      !isOverdue && !isDueToday && !isDueSoon && 'text-muted-foreground'
                    )}
                  >
                    {isOverdue ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    <span>{format(new Date(tarefa.data_vencimento), 'dd/MM')}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isOverdue
                    ? `Atrasado há ${Math.abs(daysUntilDue!)} dias`
                    : isDueToday
                      ? 'Vence hoje'
                      : `Vence em ${daysUntilDue} dias`
                  }
                </TooltipContent>
              </Tooltip>
            )}

            <div className="flex items-center gap-1.5">
              {attachmentCount > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Paperclip className="h-3 w-3" />
                      <span>{attachmentCount}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{attachmentCount} anexo(s)</TooltipContent>
                </Tooltip>
              )}

              {referenceCount > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Link2 className="h-3 w-3" />
                      <span>{referenceCount}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{referenceCount} referência(s)</TooltipContent>
                </Tooltip>
              )}

              {commentCount > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span>{commentCount}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{commentCount} comentário(s)</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <div className="flex -space-x-1">
            {tarefa.assignees && tarefa.assignees.length > 0 ? (
              <>
                {tarefa.assignees.slice(0, 3).map((assignee) => (
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
                {tarefa.assignees.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px]">
                    +{tarefa.assignees.length - 3}
                  </div>
                )}
              </>
            ) : tarefa.responsavel ? (
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={tarefa.responsavel.avatar_url} />
                    <AvatarFallback className="text-[10px]">
                      {tarefa.responsavel.full_name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{tarefa.responsavel.full_name}</TooltipContent>
              </Tooltip>
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <User className="h-3 w-3 text-muted-foreground/50" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { KanbanCardContent };

interface KanbanCardV2Props {
  tarefa: Tarefa;
  index: number;
  onEdit: (tarefa: Tarefa) => void;
  onDelete: (id: string) => void;
  onView: (tarefa: Tarefa) => void;
  onDuplicate?: (tarefa: Tarefa) => void;
  onArchive?: (id: string) => void;
}

export function KanbanCardV2({ tarefa, index, onEdit, onDelete, onView, onDuplicate, onArchive }: KanbanCardV2Props) {
  return (
    <Draggable draggableId={tarefa.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onView(tarefa)}
          className={cn(
            'group rounded-xl border bg-card shadow-sm transition-all duration-200 cursor-pointer',
            'hover:shadow-md hover:border-primary/30',
            snapshot.isDragging && 'shadow-lg rotate-1 scale-[1.02] border-primary z-50',
            tarefa.cover_image && 'overflow-hidden'
          )}
        >
          <KanbanCardContent
            tarefa={tarefa}
            variant="default"
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            onDuplicate={onDuplicate}
            onArchive={onArchive}
          />
        </div>
      )}
    </Draggable>
  );
}
