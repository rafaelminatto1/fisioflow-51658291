import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, GanttChart, Clock, User, CheckCircle2 } from "lucide-react";
import { BoardItem } from "@/types/boards";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GanttViewProps {
  items: BoardItem[];
}

export function GanttView({ items }: GanttViewProps) {
  return (
    <div className="space-y-4 p-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <GanttChart className="w-5 h-5 text-primary" />
            Visão de Linha do Tempo (Gantt Clínico)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento de prazos, entregas e marcos de tratamento em formato de cronograma.
          </p>
        </div>
        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
          {items.length} cartões no plano
        </Badge>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 text-xs">
          Nenhum cartão com prazo para exibição no cronograma Gantt.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const dueDate = item.due_date ? new Date(item.due_date) : null;
            const progress = item.is_completed ? 100 : item.subtasks_count && item.subtasks_completed ? Math.round((item.subtasks_completed / item.subtasks_count) * 100) : 30;

            return (
              <Card key={item.id || index} className="p-3 border hover:shadow-xs transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </span>
                      {item.priority && (
                        <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 font-medium">
                          {item.priority}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      {dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          Prazo: {format(dueDate, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                      {item.assignee_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-emerald-500" />
                          {item.assignee_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra Visual de Gantt / Progresso */}
                  <div className="w-full sm:w-64 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Progresso</span>
                      <span className="font-bold">{progress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          progress === 100 ? "bg-emerald-500" : "bg-primary"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
