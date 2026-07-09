import { useMemo } from "react";
import { AlertCircle, CalendarClock, CalendarDays, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tarefa,
  PRIORIDADE_LABELS,
  PRIORIDADE_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/types/tarefas";
import { groupMinhasTarefas, type MinhasTarefasGrupos } from "@/lib/tarefasGrouping";
import { safeFormat } from "@/lib/utils";

interface MinhasTarefasViewProps {
  tarefas: Tarefa[];
  userId: string;
  onViewTask: (tarefa: Tarefa) => void;
}

const GRUPOS: Array<{
  key: keyof MinhasTarefasGrupos;
  label: string;
  icon: typeof AlertCircle;
  accent: string;
}> = [
  { key: "atrasadas", label: "Atrasadas", icon: AlertCircle, accent: "text-red-600" },
  { key: "hoje", label: "Hoje", icon: CalendarClock, accent: "text-blue-600" },
  { key: "emBreve", label: "Em breve (7 dias)", icon: CalendarDays, accent: "text-emerald-600" },
  { key: "semData", label: "Sem data", icon: Inbox, accent: "text-slate-500" },
];

export function MinhasTarefasView({ tarefas, userId, onViewTask }: MinhasTarefasViewProps) {
  const grupos = useMemo(
    () => groupMinhasTarefas(tarefas, userId, new Date().toISOString().slice(0, 10)),
    [tarefas, userId],
  );

  const total = GRUPOS.reduce((acc, g) => acc + grupos[g.key].length, 0);

  if (total === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Nenhuma tarefa aberta atribuída a você. Bom trabalho!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {GRUPOS.map(({ key, label, icon: Icon, accent }) => (
        <Card key={key} className={cn(key === "atrasadas" && grupos[key].length > 0 && "border-red-500/50")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight">
              <Icon className={cn("h-4 w-4", accent)} />
              {label}
              <Badge variant="secondary" className="ml-auto">
                {grupos[key].length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {grupos[key].length === 0 && (
              <p className="text-xs text-muted-foreground py-2">Nada por aqui.</p>
            )}
            {grupos[key].map((tarefa) => (
              <button
                key={tarefa.id}
                type="button"
                onClick={() => onViewTask(tarefa)}
                className="w-full text-left rounded-xl border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-tight">{tarefa.titulo}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[10px] border-none",
                      PRIORIDADE_COLORS[tarefa.prioridade],
                    )}
                  >
                    {PRIORIDADE_LABELS[tarefa.prioridade]}
                  </Badge>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span
                      className={cn("h-2 w-2 rounded-full", STATUS_COLORS[tarefa.status]?.dot)}
                    />
                    {STATUS_LABELS[tarefa.status]}
                  </span>
                  {tarefa.data_vencimento && (
                    <span>{safeFormat(tarefa.data_vencimento, "dd/MM/yyyy")}</span>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
