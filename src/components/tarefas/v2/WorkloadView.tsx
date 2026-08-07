import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, CheckSquare, Clock, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { useTarefas, Tarefa } from "@/hooks/useTarefas";
import { useTeamMembers } from "@/hooks/useTeamMembers";

export function WorkloadView() {
  const { data: tarefas = [] } = useTarefas();
  const { data: teamMembers = [] } = useTeamMembers();

  // Computação de carga por profissional
  const memberWorkloads = useMemo(() => {
    const defaultCapacity = 10; // Capacidade padrão de 10 tarefas/sessões por dia/semana

    return teamMembers.map((member) => {
      const assignedTasks = tarefas.filter(
        (t) => t.responsavel_id === member.id && t.status !== "concluida" && t.status !== "cancelada"
      );
      const completedTasks = tarefas.filter(
        (t) => t.responsavel_id === member.id && t.status === "concluida"
      );
      const highPriorityTasks = assignedTasks.filter((t) => t.prioridade === "alta" || t.prioridade === "urgente");

      const count = assignedTasks.length;
      const percentage = Math.min(100, Math.round((count / defaultCapacity) * 100));

      let status: "low" | "optimal" | "high" | "overloaded" = "low";
      let statusLabel = "Livre";
      let statusColor = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";

      if (count >= 10) {
        status = "overloaded";
        statusLabel = "Sobrecarregado";
        statusColor = "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
      } else if (count >= 7) {
        status = "high";
        statusLabel = "Carga Alta";
        statusColor = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      } else if (count >= 4) {
        status = "optimal";
        statusLabel = "Equilibrada";
        statusColor = "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      }

      const initials = member.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      return {
        member,
        assignedTasks,
        completedTasksCount: completedTasks.length,
        highPriorityCount: highPriorityTasks.length,
        count,
        percentage,
        status,
        statusLabel,
        statusColor,
        initials,
      };
    });
  }, [teamMembers, tarefas]);

  // Unassigned tasks
  const unassignedTasks = useMemo(() => {
    return tarefas.filter((t) => !t.responsavel_id && t.status !== "concluida");
  }, [tarefas]);

  return (
    <div className="space-y-6 p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Carga de Trabalho da Equipe
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Monitore a distribuição de tarefas e atendimentos entre os fisioterapeutas para evitar sobrecarga.
          </p>
        </div>

        {unassignedTasks.length > 0 && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 px-3 py-1 text-xs flex items-center gap-1.5 self-start sm:self-auto">
            <AlertTriangle className="w-3.5 h-3.5" />
            {unassignedTasks.length} tarefas sem responsável
          </Badge>
        )}
      </div>

      {/* Grid de Profissionais */}
      {memberWorkloads.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          Nenhum membro da equipe cadastrado para monitoramento de carga.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberWorkloads.map(({ member, count, percentage, statusLabel, statusColor, initials, highPriorityCount, completedTasksCount }) => (
            <Card key={member.id} className="hover:shadow-md transition-all duration-200 border">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {member.full_name}
                    </CardTitle>
                    <span className="text-xs text-slate-500 capitalize">{member.role || "Fisioterapeuta"}</span>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border font-semibold ${statusColor}`}>
                  {statusLabel}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4 text-xs">
                {/* Barra de Progresso de Carga */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Ocupação de Capacidade</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">{count} pendentes</span>
                  </div>
                  <Progress value={percentage} className="h-2 bg-slate-100 dark:bg-slate-800" />
                </div>

                {/* Estatísticas do Profissional */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-md">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Concluídas: <strong className="text-slate-900 dark:text-slate-100">{completedTasksCount}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-md">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Urgentes: <strong className="text-slate-900 dark:text-slate-100">{highPriorityCount}</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
