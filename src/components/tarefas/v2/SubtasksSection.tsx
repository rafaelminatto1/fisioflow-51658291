import { useMemo, useState } from "react";
import { Plus, ListTree } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTarefas, useCreateTarefa, useUpdateTarefa } from "@/hooks/useTarefas";
import { STATUS_LABELS } from "@/types/tarefas";

interface SubtasksSectionProps {
  parentId: string | undefined;
}

/** Subtarefas via parent_id (US-18): lista, conclui e cria filhas da tarefa. */
export function SubtasksSection({ parentId }: SubtasksSectionProps) {
  const { data: tarefas } = useTarefas();
  const createTarefa = useCreateTarefa();
  const updateTarefa = useUpdateTarefa();
  const [novoTitulo, setNovoTitulo] = useState("");

  const subtasks = useMemo(
    () => (tarefas ?? []).filter((t) => t.parent_id === parentId),
    [tarefas, parentId],
  );

  if (!parentId) return null;

  const addSubtask = () => {
    const titulo = novoTitulo.trim();
    if (!titulo) return;
    createTarefa.mutate(
      { titulo, parent_id: parentId, status: "A_FAZER" },
      { onSuccess: () => setNovoTitulo("") },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ListTree className="h-4 w-4 text-slate-400" />
        <span className="font-bold text-xs text-slate-500 uppercase">Subtarefas</span>
        {subtasks.length > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {subtasks.filter((t) => t.status === "CONCLUIDO").length}/{subtasks.length}
          </Badge>
        )}
      </div>

      <div className="space-y-1.5">
        {subtasks.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2"
          >
            <Checkbox
              checked={sub.status === "CONCLUIDO"}
              onCheckedChange={(checked) =>
                updateTarefa.mutate({
                  id: sub.id,
                  status: checked ? "CONCLUIDO" : "A_FAZER",
                  ...(checked ? { completed_at: new Date().toISOString() } : {}),
                })
              }
            />
            <span
              className={cn(
                "flex-1 text-sm",
                sub.status === "CONCLUIDO" && "text-muted-foreground line-through",
              )}
            >
              {sub.titulo}
            </span>
            <Badge variant="outline" className="text-[9px]">
              {STATUS_LABELS[sub.status]}
            </Badge>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSubtask();
            }
          }}
          placeholder="Nova subtarefa…"
          className="h-9 rounded-xl text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addSubtask}
          disabled={!novoTitulo.trim() || createTarefa.isPending}
          className="h-9 gap-1 rounded-xl"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}
