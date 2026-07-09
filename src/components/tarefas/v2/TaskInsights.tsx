import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertCircle,
  Zap,
  CheckCircle2,
  Users,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { cn, safeFormat } from "@/lib/utils";
import { subDays } from "date-fns";
import {
  Tarefa,
  TarefaStatus,
  TarefaPrioridade,
  TeamMember,
  STATUS_LABELS,
  PRIORIDADE_LABELS,
  TaskStats,
} from "@/types/tarefas";

interface TaskInsightsProps {
  stats: TaskStats;
  effectiveTarefas: Tarefa[];
  teamMembers?: TeamMember[];
}

export default function TaskInsights({
  stats,
  effectiveTarefas,
  teamMembers = [],
}: TaskInsightsProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const weeklySummary = useMutation({
    mutationFn: async () => {
      const res = await request<{ data: { text: string } }>("/api/tarefas/ai/weekly-summary", {
        method: "POST",
      });
      return res.data.text;
    },
    onSuccess: setAiSummary,
    onError: (err: Error) => toast.error("Falha no resumo semanal: " + err.message),
  });

  // Carga de trabalho por membro (tarefas abertas)
  const workload = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const byMember = new Map<
      string,
      { total: number; emProgresso: number; atrasadas: number; urgentes: number }
    >();
    for (const t of effectiveTarefas) {
      if (t.status === "CONCLUIDO" || t.status === "ARQUIVADO") continue;
      const key = t.responsavel_id || "__sem__";
      const entry = byMember.get(key) ?? { total: 0, emProgresso: 0, atrasadas: 0, urgentes: 0 };
      entry.total++;
      if (t.status === "EM_PROGRESSO") entry.emProgresso++;
      if (t.data_vencimento && String(t.data_vencimento).slice(0, 10) < today) entry.atrasadas++;
      if (t.prioridade === "URGENTE") entry.urgentes++;
      byMember.set(key, entry);
    }
    const memberName = (id: string) =>
      id === "__sem__"
        ? "Sem responsável"
        : (teamMembers.find((m) => m.id === id)?.full_name ?? "Membro");
    return Array.from(byMember.entries())
      .map(([id, data]) => ({ id, name: memberName(id), ...data }))
      .sort((a, b) => b.total - a.total);
  }, [effectiveTarefas, teamMembers]);

  const maxWorkload = Math.max(1, ...workload.map((w) => w.total));

  // Relatório de fluxo (burnup + velocity) — US-19
  const { data: flowReport } = useQuery({
    queryKey: ["tarefas-flow-report"],
    queryFn: async () => {
      const res = await request<{
        data: {
          daily: Array<{ date: string; created: number; completed: number }>;
          velocity: Array<{ week: string; completed: number }>;
          open_now: number;
        };
      }>("/api/tarefas/reports/flow?days=30");
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const burnupData = useMemo(() => {
    if (!flowReport?.daily) return [];
    let createdAcc = 0;
    let completedAcc = 0;
    return flowReport.daily.map((d) => {
      createdAcc += d.created;
      completedAcc += d.completed;
      return {
        date: d.date.slice(5),
        criadas: createdAcc,
        concluidas: completedAcc,
      };
    });
  }, [flowReport]);
  // Chart data for insights
  const chartData = useMemo(() => {
    if (!stats) return { status: [], priority: [], weekly: [] };

    const statusData = Object.entries(STATUS_LABELS)
      .filter(([key]) => key !== "ARQUIVADO")
      .map(([key, label]) => ({
        name: label,
        value: stats.by_status[key as TarefaStatus] || 0,
        color:
          key === "CONCLUIDO"
            ? "#22c55e"
            : key === "EM_PROGRESSO"
              ? "#3b82f6"
              : key === "REVISAO"
                ? "#a855f7"
                : key === "A_FAZER"
                  ? "#64748b"
                  : "#94a3b8",
      }));

    const priorityData = Object.entries(PRIORIDADE_LABELS).map(([key, label]) => ({
      name: label,
      value: stats.by_priority[key as TarefaPrioridade] || 0,
    }));

    // Weekly trend (last 7 days)
    const weeklyData = [];
    const today = new Date();

    // Pre-filter tasks by date range for better performance
    const tasksByDate = effectiveTarefas?.reduce(
      (acc, t) => {
        if (t && t.created_at) {
          const dateKey = t.created_at.split("T")[0];
          acc.created[dateKey] = (acc.created[dateKey] || 0) + 1;
        }
        if (t && t.completed_at) {
          const dateKey = t.completed_at.split("T")[0];
          acc.completed[dateKey] = (acc.completed[dateKey] || 0) + 1;
        }
        return acc;
      },
      {
        created: {} as Record<string, number>,
        completed: {} as Record<string, number>,
      },
    ) || { created: {}, completed: {} };

    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = safeFormat(date, "yyyy-MM-dd");

      const created = tasksByDate.created[dateStr] || 0;
      const completed = tasksByDate.completed[dateStr] || 0;

      weeklyData.push({
        date: safeFormat(date, "EEE"),
        criadas: created,
        concluidas: completed,
      });
    }

    return { status: statusData, priority: priorityData, weekly: weeklyData };
  }, [stats, effectiveTarefas]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData.status}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {chartData.status.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Priority Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por Prioridade</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.priority} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <RechartsTooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Tendência Semanal</CardTitle>
          <CardDescription>Tarefas criadas vs. concluídas nos últimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData.weekly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="criadas"
                name="Criadas"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="concluidas"
                name="Concluídas"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Insights de Produtividade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Completion Rate */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
              <div className="flex items-center gap-2 mb-2">
                {stats.completion_rate >= 50 ? (
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium text-green-700 dark:text-green-400">
                  Taxa de Conclusão
                </span>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {stats.completion_rate.toFixed(0)}%
              </p>
              <p className="text-sm text-green-600/70 mt-1">
                {stats.by_status["CONCLUIDO"] || 0} de {stats.total} tarefas concluídas
              </p>
            </div>

            {/* Average Cycle Time */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-700 dark:text-blue-400">Tempo Médio</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {stats.average_cycle_time.toFixed(1)} dias
              </p>
              <p className="text-sm text-blue-600/70 mt-1">Tempo médio para concluir tarefas</p>
            </div>

            {/* Overdue Alert */}
            <div
              className={cn(
                "p-4 rounded-lg",
                stats.overdue > 0
                  ? "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30"
                  : "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30",
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle
                  className={cn("h-5 w-5", stats.overdue > 0 ? "text-red-600" : "text-gray-600")}
                />
                <span
                  className={cn(
                    "font-medium",
                    stats.overdue > 0
                      ? "text-red-700 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300",
                  )}
                >
                  Atenção Necessária
                </span>
              </div>
              <p
                className={cn(
                  "text-3xl font-bold",
                  stats.overdue > 0 ? "text-red-600" : "text-gray-600",
                )}
              >
                {stats.overdue + stats.due_soon}
              </p>
              <p
                className={cn(
                  "text-sm mt-1",
                  stats.overdue > 0 ? "text-red-600/70" : "text-gray-600/70",
                )}
              >
                {stats.overdue} atrasadas, {stats.due_soon} vencem em breve
              </p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="mt-6 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Recomendações
            </h4>

            {stats.overdue > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">
                    {stats.overdue} tarefas atrasadas
                  </p>
                  <p className="text-sm text-red-600/70">
                    Considere repriorizar ou delegar essas tarefas para evitar acúmulo.
                  </p>
                </div>
              </div>
            )}

            {(stats.by_status["EM_PROGRESSO"] || 0) > 5 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
                <Clock className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">
                    Muitas tarefas em progresso
                  </p>
                  <p className="text-sm text-yellow-600/70">
                    Focar em concluir tarefas antes de iniciar novas pode melhorar o fluxo de
                    trabalho.
                  </p>
                </div>
              </div>
            )}

            {stats.completion_rate >= 70 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Excelente taxa de conclusão!
                  </p>
                  <p className="text-sm text-green-600/70">
                    Sua equipe está performando bem com {stats.completion_rate.toFixed(0)}% das
                    tarefas concluídas.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Carga por membro (US-16) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Carga de trabalho por membro
          </CardTitle>
          <CardDescription>Tarefas abertas por responsável</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {workload.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa aberta.</p>
          )}
          {workload.map((w) => (
            <div key={w.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{w.name}</span>
                <span className="text-xs text-muted-foreground">
                  {w.total} aberta{w.total > 1 ? "s" : ""}
                  {w.atrasadas > 0 && (
                    <span className="ml-2 font-bold text-red-600">{w.atrasadas} atrasadas</span>
                  )}
                  {w.urgentes > 0 && (
                    <span className="ml-2 font-bold text-orange-600">{w.urgentes} urgentes</span>
                  )}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    w.atrasadas > 0 ? "bg-red-500" : "bg-blue-500",
                  )}
                  style={{ width: `${(w.total / maxWorkload) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Burnup + Velocity (US-19) */}
      {burnupData.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Burnup (30 dias)
              </CardTitle>
              <CardDescription>
                Criadas vs concluídas acumuladas · {flowReport?.open_now ?? 0} abertas hoje
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={burnupData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <RechartsTooltip />
                  <Area
                    type="monotone"
                    dataKey="criadas"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.15}
                    name="Criadas"
                  />
                  <Area
                    type="monotone"
                    dataKey="concluidas"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.25}
                    name="Concluídas"
                  />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Velocity semanal
              </CardTitle>
              <CardDescription>Tarefas concluídas por semana (6 semanas)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(flowReport?.velocity ?? []).map((v) => ({ ...v, week: v.week.slice(5) }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="completed" name="Concluídas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resumo semanal por IA (US-13) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                Resumo semanal (IA)
              </CardTitle>
              <CardDescription>Estado do board nos últimos 7 dias</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-xl"
              onClick={() => weeklySummary.mutate()}
              disabled={weeklySummary.isPending}
            >
              {weeklySummary.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Gerar resumo
            </Button>
          </div>
        </CardHeader>
        {aiSummary && (
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{aiSummary}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
