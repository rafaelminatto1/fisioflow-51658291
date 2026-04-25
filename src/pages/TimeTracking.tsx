/**
 * Time Tracking Page - Dashboard principal de controle de tempo
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Play, Pause, Square, TrendingUp, Download, Plus } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useTimeTracker } from "@/hooks/useTimeTracker";
import { useAuth } from "@/contexts/AuthContext";
import { TimeSheet } from "@/components/timetracking/TimeSheet";
import { TimeEntryModal } from "@/components/timetracking/TimeEntryModal";
import { WeeklySummary } from "@/components/timetracking/WeeklySummary";
import { TimeTrackingCalendarView } from "@/components/timetracking/TimeTrackingCalendarView";
import { formatDuration, formatHoursDecimal } from "@/lib/timetracking/timeCalculator";

import type { ReportPeriod, TimeSheetView } from "@/types/timetracking";

export default function TimeTrackingPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const organizationId = profile?.organization_id ?? "";
  const userId = user?.uid ?? "";

  const [period, setPeriod] = useState<ReportPeriod>("today");
  const [view, setView] = useState<TimeSheetView>("weekly");
  const [showEntryModal, setShowEntryModal] = useState(false);

  const {
    activeTimer,
    currentDuration,
    entries,
    isLoading,
    startTimer,
    pauseTimer,
    stopTimer,
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    getStats,
    refresh,
  } = useTimeTracker({
    organizationId,
    userId,
  });

  // Carregar entradas ao montar
  useEffect(() => {
    if (organizationId && userId) {
      loadEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, userId]);

  // Estatísticas calculadas
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const _stats = useMemo(() => getStats(), [entries, getStats]);

  // Dados filtrados por período
  const filteredEntries = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "yesterday":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(now.setHours(23, 59, 59, 999));
        endDate.setDate(endDate.getDate() - 1);
        break;
      case "this_week":
        startDate = startOfWeek(now, { locale: ptBR });
        endDate = endOfWeek(now, { locale: ptBR });
        break;
      case "last_week": {
        const lastWeek = subDays(now, 7);
        startDate = startOfWeek(lastWeek, { locale: ptBR });
        endDate = endOfWeek(lastWeek, { locale: ptBR });
        break;
      }
      case "this_month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "last_month": {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      }
      case "all_time":
        startDate = new Date(0);
        endDate = now;
        break;
      default:
        startDate = new Date(0);
        endDate = now;
    }

    return entries.filter((e) => {
      const entryDate = new Date(e.start_time);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [entries, period]);

  // Métricas do período
  const periodMetrics = useMemo(() => {
    const totalSeconds = filteredEntries.reduce((sum, e) => sum + e.duration_seconds, 0);
    const billableSeconds = filteredEntries
      .filter((e) => e.is_billable)
      .reduce((sum, e) => sum + e.duration_seconds, 0);
    const utilizationRate = totalSeconds > 0 ? (billableSeconds / totalSeconds) * 100 : 0;
    const totalValue = filteredEntries.reduce((sum, e) => sum + (e.total_value || 0), 0);

    return {
      totalSeconds,
      billableSeconds,
      nonBillableSeconds: totalSeconds - billableSeconds,
      utilizationRate,
      totalValue,
      entryCount: filteredEntries.length,
    };
  }, [filteredEntries]);

  const handleQuickStart = () => {
    const description = prompt("Descrição da atividade:");
    if (description) {
      startTimer(description);
    }
  };

  const handleStopTimer = async () => {
    await stopTimer();
    await refresh();
  };

  return (
    <MainLayout>
      <div className="space-y-4 pb-20 md:pb-0 animate-fade-in">
        {/* Compact header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold leading-tight">Time Tracking</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
                <span>
                  <span className="font-medium text-foreground">
                    {formatHoursDecimal(periodMetrics.totalSeconds)}
                  </span>{" "}
                  horas
                </span>
                <span className="text-border">·</span>
                <span>
                  <span className="font-medium text-emerald-600">
                    {formatHoursDecimal(periodMetrics.billableSeconds)}
                  </span>{" "}
                  faturável
                </span>
                <span className="text-border hidden sm:inline">·</span>
                <span className="hidden sm:inline">
                  <span className="font-medium text-amber-600">
                    {periodMetrics.utilizationRate.toFixed(0)}%
                  </span>{" "}
                  utilização
                </span>
                <span className="text-border hidden sm:inline">·</span>
                <span className="hidden sm:inline">
                  <span className="font-medium text-primary">
                    R$ {periodMetrics.totalValue.toFixed(2)}
                  </span>{" "}
                  valor
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate("/timetracking/reports")}
            >
              <TrendingUp className="w-4 h-4" />
              Relatórios
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setShowEntryModal(true)}>
              <Plus className="w-4 h-4" />
              Nova Entrada
            </Button>
          </div>
        </div>

        {/* Timer Rápido */}
        {activeTimer && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <p className="font-medium">{activeTimer.description}</p>
                    <p className="text-sm text-muted-foreground">
                      Iniciado às{" "}
                      {new Date(activeTimer.start_time).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-mono text-2xl font-bold">
                    {formatDuration(currentDuration)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={pauseTimer}>
                      <Pause className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleStopTimer}>
                      <Square className="w-4 h-4 mr-2" />
                      Parar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Utilização Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Taxa de Utilização</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={periodMetrics.utilizationRate} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Não faturável: {formatDuration(periodMetrics.nonBillableSeconds)}</span>
              <span>Faturável: {formatDuration(periodMetrics.billableSeconds)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs
          defaultValue="timesheet"
          value={view}
          onValueChange={(v) => setView(v as TimeSheetView)}
        >
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="daily">Diário</TabsTrigger>
              <TabsTrigger value="weekly">Semanal</TabsTrigger>
              <TabsTrigger value="calendar">Calendário</TabsTrigger>
            </TabsList>

            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                aria-label="Selecionar período do relatório"
              >
                <option value="today">Hoje</option>
                <option value="yesterday">Ontem</option>
                <option value="this_week">Esta Semana</option>
                <option value="last_week">Semana Passada</option>
                <option value="this_month">Este Mês</option>
                <option value="last_month">Mês Passado</option>
                <option value="all_time">Todo o Período</option>
              </select>
              <Button variant="outline" size="icon" title="Baixar relatório">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="daily" className="mt-4">
            <TimeSheet
              entries={filteredEntries}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            <WeeklySummary
              entries={filteredEntries}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <TimeTrackingCalendarView entries={filteredEntries} />
          </TabsContent>
        </Tabs>

        {/* Quick Start (quando não há timer ativo) */}
        {!activeTimer && (
          <Card className="border-dashed">
            <CardContent className="p-6">
              <div className="text-center">
                <Play className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">
                  Nenhum timer ativo. Inicie uma tarefa agora.
                </p>
                <Button onClick={handleQuickStart} variant="outline">
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Timer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Nova Entrada */}
      {showEntryModal && (
        <TimeEntryModal
          onClose={() => setShowEntryModal(false)}
          onSave={async (data) => {
            await createEntry(data);
            setShowEntryModal(false);
            refresh();
          }}
        />
      )}
    </MainLayout>
  );
}
