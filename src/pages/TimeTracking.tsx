/**
 * Time Tracking Page - Dashboard principal de controle de tempo
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Play,
  Pause,
  Square,
  Calendar,
  TrendingUp,
  DollarSign,
  Filter,
  Download,
  Plus,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTimeTracker } from '@/hooks/useTimeTracker';
import { useAuth } from '@/contexts/AuthContext';
import { TimeSheet } from '@/components/timetracking/TimeSheet';
import { TimeReport } from '@/components/timetracking/TimeReport';
import { TimeEntryModal } from '@/components/timetracking/TimeEntryModal';
import { WeeklySummary } from '@/components/timetracking/WeeklySummary';
import {
  formatDuration,
  formatHoursDecimal,
  calculateUtilizationRate,
} from '@/lib/timetracking/timeCalculator';

import type { ReportPeriod, TimeSheetView } from '@/types/timetracking';

export default function TimeTrackingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<ReportPeriod>('today');
  const [view, setView] = useState<TimeSheetView>('weekly');
  const [showEntryModal, setShowEntryModal] = useState(false);

  const {
    activeTimer,
    isRunning,
    currentDuration,
    entries,
    isLoading,
    error,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    getStats,
    refresh,
  } = useTimeTracker({
    organizationId: user?.organizationId || '',
    userId: user?.uid || '',
  });

  // Carregar entradas ao montar
  useState(() => {
    loadEntries();
  });

  // Estatísticas calculadas
  const stats = useMemo(() => getStats(), [entries, getStats]);

  // Dados filtrados por período
  const filteredEntries = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'yesterday':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(now.setHours(23, 59, 59, 999));
        endDate.setDate(endDate.getDate() - 1);
        break;
      case 'this_week':
        startDate = startOfWeek(now, { locale: ptBR });
        endDate = endOfWeek(now, { locale: ptBR });
        break;
      case 'last_week':
        const lastWeek = subDays(now, 7);
        startDate = startOfWeek(lastWeek, { locale: ptBR });
        endDate = endOfWeek(lastWeek, { locale: ptBR });
        break;
      case 'this_month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'all_time':
        startDate = new Date(0);
        endDate = now;
        break;
      default:
        startDate = new Date(0);
        endDate = now;
    }

    return entries.filter((e) => {
      const entryDate = e.start_time.toDate();
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
    const description = prompt('Descrição da atividade:');
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
      <div className="min-h-screen bg-background/50">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Time Tracking</h1>
                <p className="text-sm text-muted-foreground">
                  Controle seu tempo e produtividade
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => navigate('/timetracking/reports')}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Relatórios
                </Button>
                <Button onClick={() => setShowEntryModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Entrada
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6 space-y-6">
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
                        Iniciado às{' '}
                        {new Date(activeTimer.start_time).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total de Horas"
              value={formatHoursDecimal(periodMetrics.totalSeconds)}
              subtitle={`${filteredEntries.length} entradas`}
              icon={Clock}
              color="blue"
            />
            <StatCard
              title="Faturável"
              value={formatHoursDecimal(periodMetrics.billableSeconds)}
              subtitle={`${periodMetrics.utilizationRate.toFixed(0)}% do total`}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              title="Taxa de Utilização"
              value={`${periodMetrics.utilizationRate.toFixed(0)}%`}
              subtitle="tempo faturável / total"
              icon={TrendingUp}
              color="purple"
            />
            <StatCard
              title="Valor Total"
              value={`R$ ${periodMetrics.totalValue.toFixed(2)}`}
              subtitle="do período selecionado"
              icon={DollarSign}
              color="yellow"
            />
          </div>

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
          <Tabs defaultValue="timesheet" value={view} onValueChange={(v) => setView(v as TimeSheetView)}>
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
                >
                  <option value="today">Hoje</option>
                  <option value="yesterday">Ontem</option>
                  <option value="this_week">Esta Semana</option>
                  <option value="last_week">Semana Passada</option>
                  <option value="this_month">Este Mês</option>
                  <option value="last_month">Mês Passado</option>
                  <option value="all_time">Todo o Período</option>
                </select>
                <Button variant="outline" size="icon">
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
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Visualização de calendário em breve...</p>
              </div>
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

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
