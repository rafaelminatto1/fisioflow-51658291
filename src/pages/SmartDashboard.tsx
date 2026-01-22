import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { ScrollArea } from '@/components/web/ui/scroll-area';
import { Button } from '@/components/shared/ui/button';
import {
  Brain, TrendingUp, AlertTriangle, Users, DollarSign,
  Calendar, BarChart3, CheckCircle,
  MessageSquare, Sparkles, Package,
  LayoutDashboard, Save, RotateCcw
} from 'lucide-react';
import { useAppointmentPredictions, useRevenueForecasts, useStaffPerformance, useInventory } from '@/hooks/useInnovations';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useEventos } from '@/hooks/useEventos';
import { useNotifications } from '@/hooks/useNotifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from 'recharts';
import { DraggableGrid, GridItem } from '@/components/web/ui/DraggableGrid';
import { Layout } from 'react-grid-layout';
import { GridWidget } from '@/components/web/ui/GridWidget';
import { toast } from 'sonner';

type ViewMode = 'today' | 'week' | 'month' | 'custom';

export default function SmartDashboard() {
  const [isEditable, setIsEditable] = useState(false);
  const [savedLayout, setSavedLayout] = useState<Layout>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('today');

  // Load layout from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dashboard_layout_v1');
    if (saved) {
      try {
        setSavedLayout(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved layout', e);
      }
    }
  }, []);

  const handleSaveLayout = (layout: Layout) => {
    localStorage.setItem('dashboard_layout_v1', JSON.stringify(layout));
    setSavedLayout(layout);
    setIsEditable(false);
    toast.success('Layout salvo com sucesso!');
  };

  const handleResetLayout = () => {
    localStorage.removeItem('dashboard_layout_v1');
    setSavedLayout([]);
    window.location.reload(); // Simple way to reset state
  };

  // Data Hooks
  const { data: metrics, isLoading: isLoadingMetrics } = useDashboardMetrics();
  const { data: predictions = [] } = useAppointmentPredictions();
  const { data: forecasts = [] } = useRevenueForecasts();
  const { data: staffPerformance = [] } = useStaffPerformance();
  const { data: inventory = [] } = useInventory();
  const { data: eventos = [] } = useEventos();
  const { notifications } = useNotifications(5);

  // Calculate Event Stats
  const eventStats = {
    total: eventos.length,
    active: eventos.filter(e => e.status === 'AGENDADO' || e.status === 'EM_ANDAMENTO').length,
    completed: eventos.filter(e => e.status === 'CONCLUIDO').length,
    revenue: eventos.reduce((acc, curr) => acc + (curr.valor_padrao_prestador || 0), 0),
    participants: 40, // Mock for now as we don't have participants table linked yet
    completionRate: eventos.length > 0
      ? Math.round((eventos.filter(e => e.status === 'CONCLUIDO').length / eventos.length) * 100)
      : 0,
    margin: 0, // Placeholder
    avgParticipants: 0, // Placeholder
  };

  // High-risk appointments (no-show probability > 30%)
  const highRiskAppointments = predictions.filter(p => p.no_show_probability > 0.3);

  // Low stock items
  const lowStockItems = inventory.filter(i => i.current_quantity <= i.minimum_quantity);

  // Revenue forecast data
  const revenueChartData = forecasts.slice(-30).map(f => ({
    date: format(new Date(f.forecast_date), 'dd/MM'),
    previsao: f.predicted_revenue,
    real: f.actual_revenue || 0,
  }));

  // Determine displayed values based on View Mode
  const getDisplayValue = (type: 'appointments' | 'completed' | 'new_patients' | 'revenue') => {
    if (!metrics) return 0;

    switch (viewMode) {
      case 'today':
        if (type === 'appointments') return metrics.agendamentosHoje;
        if (type === 'completed') return metrics.agendamentosConcluidos;
        if (type === 'new_patients') return 0; // Usually new patients are tracked monthly
        if (type === 'revenue') return 0; // Daily revenue not in top-level metrics yet, reusing monthly for now or 0
        break;
      case 'week':
        if (type === 'appointments') return metrics.agendamentosSemana;
        if (type === 'completed') return Math.round(metrics.agendamentosSemana * 0.8); // Estimate or add to hook
        if (type === 'new_patients') return Math.round(metrics.pacientesNovos / 4); // Estimate
        if (type === 'revenue') return metrics.receitaMensal / 4; // Estimate
        break;
      case 'month':
        if (type === 'appointments') return metrics.totalPatients; // Placeholder? No, need total appts month. 
        // Let's use metrics.agendamentosRestantes + metrics.agendamentosConcluidos + others for month?
        // Actually metrics has specific fields. Let's try to map best available.
        if (type === 'appointments') return metrics.agendamentosHoje * 20; // Rough estimate if not in metric
        if (type === 'completed') return metrics.agendamentosConcluidos * 20;
        if (type === 'new_patients') return metrics.pacientesNovos;
        if (type === 'revenue') return metrics.receitaMensal;
        break;
      default:
        return 0;
    }

    // Fallback logic for better UX if exact metric missing
    if (type === 'appointments') {
      if (viewMode === 'today') return metrics.agendamentosHoje;
      if (viewMode === 'week') return metrics.agendamentosSemana;
      return metrics.agendamentosHoje * 22; // Approximation for month
    }
    if (type === 'completed') {
      if (viewMode === 'today') return metrics.agendamentosConcluidos;
      return 0;
    }
    if (type === 'new_patients') return metrics.pacientesNovos;
    if (type === 'revenue') return metrics.receitaMensal;

    return 0;
  };

  // Refined Stats Logic
  const statsCards = [
    {
      id: 'stat-appointments',
      icon: Calendar,
      label: viewMode === 'today' ? 'Agendamentos Hoje' : viewMode === 'week' ? 'Agendamentos Semana' : 'Agendamentos Mês',
      value: viewMode === 'today' ? metrics?.agendamentosHoje || 0
        : viewMode === 'week' ? metrics?.agendamentosSemana || 0
          : (metrics?.agendamentosHoje || 0) * 22, // Placeholder for month total
      subLabel: viewMode === 'today' ? 'agendados para hoje' : 'neste período',
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-500/15 to-teal-500/10',
      borderColor: 'border-emerald-500/30',
    },
    {
      id: 'stat-revenue',
      icon: DollarSign,
      label: 'Receita do Mês', // Always Month for now as it's the stable metric
      value: `R$ ${metrics?.receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`,
      subLabel: `${metrics?.crescimentoMensal || 0}% vs. mês anterior`,
      gradient: 'from-blue-500 to-indigo-500',
      bgGradient: 'from-blue-500/15 to-indigo-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      id: 'stat-patients',
      icon: Users,
      label: 'Pacientes Ativos',
      value: metrics?.pacientesAtivos || 0,
      subLabel: `${metrics?.pacientesNovos || 0}% vs. mês anterior`, // Using new patients as growth proxy?
      gradient: 'from-purple-500 to-violet-500',
      bgGradient: 'from-purple-500/15 to-violet-500/10',
      borderColor: 'border-purple-500/30',
    },
    {
      id: 'stat-occupancy',
      icon: TrendingUp,
      label: 'Taxa de Ocupação',
      value: `${metrics?.taxaOcupacao || 0}%`,
      subLabel: 'Capacidade utilizada',
      gradient: 'from-cyan-500 to-sky-500',
      bgGradient: 'from-cyan-500/15 to-sky-500/10',
      borderColor: 'border-cyan-500/30',
    },
  ];

  /* ==========================================================================================
   * GRID ITEMS DEFINITION
   * ========================================================================================== */
  const gridItems: GridItem[] = [
    // 1. STAT CARDS
    ...statsCards.map((stat, i) => ({
      id: stat.id,
      content: (
        <GridWidget isDraggable={isEditable} className="h-full">
          <div className={`h-full relative overflow-hidden bg-gradient-to-br ${stat.bgGradient} ${stat.borderColor} hover:shadow-lg transition-all duration-300 group rounded-xl border`}>
            <CardContent className="p-4 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-md`}>
                  <stat.icon className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.subLabel}</p>
              </div>
            </CardContent>
            {isEditable && (
              <div className="absolute top-2 right-2 bg-background/50 p-1 rounded-md drag-handle cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                <LayoutDashboard className="h-4 w-4 text-foreground" />
              </div>
            )}
          </div>
        </GridWidget>
      ),
      defaultLayout: { w: 3, h: 3, x: (i * 3) % 12, y: 0, minW: 3, minH: 3 }
    })),

    // 2. REVENUE CHART (Large)
    {
      id: 'chart-revenue',
      content: (
        <GridWidget title="Previsão de Receita" icon={<DollarSign className="h-4 w-4" />} isDraggable={isEditable}>
          <div className="h-full p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorPrevisao" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <Area type="monotone" dataKey="previsao" stroke="#3B82F6" strokeWidth={2} fill="url(#colorPrevisao)" name="Previsão" />
                <Area type="monotone" dataKey="real" stroke="#10B981" strokeWidth={2} fill="url(#colorReal)" name="Real" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GridWidget>
      ),
      defaultLayout: { w: 8, h: 6, x: 0, y: 3, minW: 4, minH: 4 }
    },

    // 3. AI INSIGHTS
    {
      id: 'ai-insights',
      content: (
        <GridWidget title="Insights da IA" icon={<Sparkles className="h-4 w-4 text-primary" />} isDraggable={isEditable}>
          <ScrollArea className="h-full pr-4">
            <div className="space-y-3 pb-2">
              {highRiskAppointments.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Risco de Faltas</p>
                      <p className="text-xs text-muted-foreground">
                        {highRiskAppointments.length} agendamentos com alto risco de falta hoje/amanhã.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Engajamento</p>
                    <p className="text-xs text-muted-foreground">
                      Dica: Enviar lembretes automáticos aumenta comparecimento em até 25%.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </GridWidget>
      ),
      defaultLayout: { w: 4, h: 6, x: 8, y: 3, minW: 3, minH: 4 }
    },

    // 4. STATS EVENTS (Eventos) - Real Data
    {
      id: 'stats-events',
      content: (
        <GridWidget title="Estatísticas de Eventos" icon={<Calendar className="h-4 w-4" />} isDraggable={isEditable}>
          <div className="grid grid-cols-4 gap-2 h-full items-center">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{eventStats.total}</p>
              <p className="text-[10px] text-muted-foreground">{eventStats.active} ativos</p>
            </div>
            <div className="text-center border-l">
              <p className="text-xs text-muted-foreground">Conclusão</p>
              <p className="text-xl font-bold">{eventStats.completionRate}%</p>
              <p className="text-[10px] text-muted-foreground">{eventStats.completed} concluídos</p>
            </div>
            <div className="text-center border-l">
              <p className="text-xs text-muted-foreground">Receita Estimada</p>
              <p className="text-xl font-bold text-emerald-600">
                {eventStats.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-muted-foreground">Potencial</p>
            </div>
            <div className="text-center border-l">
              <p className="text-xs text-muted-foreground">Partic.</p>
              <p className="text-xl font-bold">{eventStats.participants}</p>
              <p className="text-[10px] text-muted-foreground">Est. 12/evento</p>
            </div>
          </div>
        </GridWidget>
      ),
      defaultLayout: { w: 8, h: 4, x: 0, y: 9, minW: 4, minH: 3 }
    },

    // 5. ACTIVITY FEED (Atividades em Tempo Real)
    {
      id: 'activity-feed',
      content: (
        <GridWidget title="Atividades em Tempo Real" icon={<CheckCircle className="h-4 w-4" />} isDraggable={isEditable}>
          <ScrollArea className="h-full">
            <div className="space-y-4 p-2">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div key={notif.id} className="flex gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${notif.type === 'success' || notif.type === 'payment' ? 'bg-green-100 text-green-600' :
                        notif.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                          notif.type === 'error' ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                      }`}>
                      {notif.type === 'payment' ? <DollarSign className="h-4 w-4" /> :
                        notif.type === 'appointment' ? <Calendar className="h-4 w-4" /> :
                          <CheckCircle className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{notif.title}</p>
                      <p className="text-xs text-muted-foreground">{notif.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Nenhuma atividade recente
                </div>
              )}
            </div>
          </ScrollArea>
        </GridWidget>
      ),
      defaultLayout: { w: 4, h: 8, x: 8, y: 9, minW: 3, minH: 4 }
    }
  ];

  /* ==========================================================================================
   * RENDER
   * ========================================================================================== */
  const ViewButton = ({ mode, label }: { mode: ViewMode, label: string }) => (
    <Button
      variant={viewMode === mode ? "default" : "outline"}
      onClick={() => setViewMode(mode)}
      className={`rounded-full px-6 transition-all ${viewMode === mode ? 'shadow-md' : 'border-transparent bg-secondary/50 hover:bg-secondary'}`}
      size="sm"
    >
      {label}
    </Button>
  );

  return (
    <MainLayout maxWidth="7xl">
      <div className="space-y-6 pb-20">
        {/* Header - Enhanced Design */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                <Brain className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center ring-2 ring-background">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                Bem-vindo de volta,
              </p>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                Rafael
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center bg-secondary/30 p-1 rounded-full border border-border/50">
              <Button
                variant={viewMode === 'today' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('today')}
                className="rounded-full px-4 text-xs h-8"
              >
                Hoje
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className="rounded-full px-4 text-xs h-8"
              >
                Esta Semana
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="rounded-full px-4 text-xs h-8"
              >
                Este Mês
              </Button>
              <Button
                variant={viewMode === 'custom' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('custom')}
                className="rounded-full px-4 text-xs h-8"
              >
                Custom
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile View Selector */}
        <div className="sm:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <ViewButton mode="today" label="Hoje" />
          <ViewButton mode="week" label="Esta Semana" />
          <ViewButton mode="month" label="Este Mês" />
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-4">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-500 flex items-center gap-2">
              Cadastros Pendentes <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-0">7</Badge>
            </h3>
            <p className="text-sm text-amber-800/80 dark:text-amber-400">
              Resolva pendências para liberar o acesso total
            </p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto text-amber-600">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Dashboard Personalizado</h2>
            <p className="text-sm text-muted-foreground">Configure seus widgets favoritos</p>
          </div>

          <div className="flex gap-2">
            {isEditable ? (
              <>
                <Button variant="outline" onClick={() => setIsEditable(false)} size="sm">
                  Cancelar
                </Button>
                <Button onClick={() => handleSaveLayout(savedLayout)} size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
                <Button variant="ghost" size="icon" onClick={handleResetLayout} title="Resetar Layout">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditable(true)} size="sm" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Personalizar
              </Button>
            )}
          </div>
        </div>

        {/* DRAGGABLE GRID */}
        <DraggableGrid
          items={gridItems}
          onLayoutChange={(layout) => {
            if (isEditable) {
              setSavedLayout(layout);
            }
          }}
          savedLayout={savedLayout}
          isEditable={isEditable}
          rowHeight={80}
        />
      </div>
    </MainLayout>
  );
}
