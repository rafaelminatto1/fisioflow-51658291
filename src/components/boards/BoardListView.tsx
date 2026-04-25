import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Circle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { BoardColumn } from "@/types/boards";
import type { Tarefa } from "@/types/tarefas";
import { useBoardLabels } from "@/contexts/BoardLabelsContext";

interface BoardListViewProps {
  columns: BoardColumn[];
  tarefas: Tarefa[];
  onAddTask: (columnId: string) => void;
  onViewTask: (tarefa: Tarefa) => void;
}

export function BoardListView({ columns, tarefas, onAddTask, onViewTask }: BoardListViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const { labelsMap } = useBoardLabels();

  const sortedCols = [...columns].sort((a, b) => a.order_index - b.order_index);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <div className="space-y-4">
      {sortedCols.map((col) => {
        const colTasks = tarefas
          .filter((t) => t.column_id === col.id)
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        const isCollapsed = collapsed.has(col.id);
        const isOverWip = !!col.wip_limit && colTasks.length > col.wip_limit;

        return (
          <div
            key={col.id}
            className="overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-sm"
          >
            {/* Column header */}
            <div
              className="flex cursor-pointer select-none items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              style={{
                backgroundColor: col.color ? `${col.color}40` : undefined,
              }}
              onClick={() => toggle(col.id)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-semibold text-sm">{col.name}</span>
              <Badge
                variant="secondary"
                className={cn("text-xs ml-1", isOverWip && "bg-red-500/20 text-red-700")}
              >
                {colTasks.length}
                {col.wip_limit ? `/${col.wip_limit}` : ""}
              </Badge>
              {isOverWip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  </TooltipTrigger>
                  <TooltipContent>Limite WIP excedido!</TooltipContent>
                </Tooltip>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddTask(col.id);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Tasks */}
            {!isCollapsed && (
              <div className="divide-y divide-border/50">
                {colTasks.map((tarefa) => (
                  <div
                    key={tarefa.id}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                    onClick={() => onViewTask(tarefa)}
                  >
                    <Circle
                      className={cn("h-3.5 w-3.5 flex-shrink-0 fill-current", {
                        "text-green-500": tarefa.prioridade === "BAIXA",
                        "text-blue-500": tarefa.prioridade === "MEDIA",
                        "text-orange-500": tarefa.prioridade === "ALTA",
                        "text-red-500": tarefa.prioridade === "URGENTE",
                      } as Record<string, boolean>)}
                    />
                    <span className="flex-1 text-sm truncate">{tarefa.titulo}</span>
                    {tarefa.data_vencimento && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {format(new Date(tarefa.data_vencimento), "dd/MM", {
                          locale: ptBR,
                        })}
                      </span>
                    )}
                    {tarefa.label_ids?.slice(0, 2).map((id) => {
                      const label = labelsMap.get(id);
                      if (!label) return null;
                      return (
                        <Badge
                          key={id}
                          variant="outline"
                          className="text-xs px-1.5 py-0 border-0"
                          style={{
                            backgroundColor: `${label.color}25`,
                            color: label.color,
                          }}
                        >
                          {label.name}
                        </Badge>
                      );
                    })}
                    {!tarefa.label_ids?.length &&
                      tarefa.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                          {tag}
                        </Badge>
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
