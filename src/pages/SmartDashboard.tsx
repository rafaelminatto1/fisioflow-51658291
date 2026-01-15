import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Brain, TrendingUp, AlertTriangle, Users, DollarSign,
  Calendar, BarChart3, CheckCircle,
  MessageSquare, Sparkles, Trophy, Package, LineChart as LineChartIcon,
  LayoutDashboard, Save, RotateCcw
} from 'lucide-react';
import { useAppointmentPredictions, useRevenueForecasts, useStaffPerformance, useInventory } from '@/hooks/useInnovations';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from 'recharts';
import { DraggableGrid, GridItem } from '@/components/ui/DraggableGrid';
import { Layout } from 'react-grid-layout';
import { GridWidget } from '@/components/ui/GridWidget';
import { toast } from 'sonner';

export default function SmartDashboard() {
  const [isEditable, setIsEditable] = useState(false);
  const [savedLayout, setSavedLayout] = useState<Layout>([]);

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

  const { data: predictions = [] } = useAppointmentPredictions();
  const { data: forecasts = [] } = useRevenueForecasts();
  const { data: staffPerformance = [] } = useStaffPerformance();
  const { data: inventory = [] } = useInventory();
  const { data: appointments = [] } = useAppointments();
  const { data: patients = [] } = usePatients();

  // Calculate today's stats
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAppointments = appointments.filter(a => (a as any).appointment_date === today);
  const completedToday = todayAppointments.filter(a => a.status === 'concluido').length;

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

  // Active patients stats
  const activePatients = patients.filter(p => p.status === 'Em Tratamento').length;
  const newPatientsThisMonth = patients.filter(p => {
    const createdAt = new Date(p.createdAt);
    const now = new Date();
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }).length;

  // Stats cards data for cleaner rendering
  const statsCards = [
    {
      id: 'stat-today',
      icon: Calendar,
      label: 'Hoje',
      value: todayAppointments.length,
      subLabel: 'agendamentos',
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-500/15 to-teal-500/10',
      borderColor: 'border-emerald-500/30',
    },
    {
      id: 'stat-completed',
      icon: CheckCircle,
      label: 'Realizados',
      value: completedToday,
      subLabel: `de ${todayAppointments.length}`,
      gradient: 'from-blue-500 to-indigo-500',
      bgGradient: 'from-blue-500/15 to-indigo-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      id: 'stat-risk',
      icon: AlertTriangle,
      label: 'Risco Alto',
      value: highRiskAppointments.length,
      subLabel: 'faltas previstas',
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-500/15 to-orange-500/10',
      borderColor: 'border-amber-500/30',
    },
    {
      id: 'stat-patients',
      icon: Users,
      label: 'Pacientes',
      value: activePatients,
      subLabel: 'em tratamento',
      gradient: 'from-purple-500 to-violet-500',
      bgGradient: 'from-purple-500/15 to-violet-500/10',
      borderColor: 'border-purple-500/30',
    },
    {
      id: 'stat-stock',
      icon: Package,
      label: 'Estoque',
      value: lowStockItems.length,
      subLabel: 'itens baixos',
      gradient: 'from-rose-500 to-pink-500',
      bgGradient: 'from-rose-500/15 to-pink-500/10',
      borderColor: 'border-rose-500/30',
    },
    {
      id: 'stat-new',
      icon: TrendingUp,
      label: 'Novos',
      value: newPatientsThisMonth,
      subLabel: 'este mês',
      gradient: 'from-cyan-500 to-sky-500',
      bgGradient: 'from-cyan-500/15 to-sky-500/10',
      borderColor: 'border-cyan-500/30',
    },
  ];

  /* ==========================================================================================
   * GRID ITEMS DEFINITION
   * ========================================================================================== */
  const gridItems: GridItem[] = [
    // 1. SMALL STAT CARDS (Top row usually)
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
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
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
      defaultLayout: { w: 2, h: 2, x: (i * 2) % 12, y: 0, minW: 2, minH: 2 }
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
      defaultLayout: { w: 8, h: 6, x: 0, y: 2, minW: 4, minH: 4 }
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
                        {highRiskAppointments.length} agendamentos com alto risco.
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
                      Exercícios via WhatsApp aumentam adesão em 40%.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </GridWidget>
      ),
      defaultLayout: { w: 4, h: 6, x: 8, y: 2, minW: 3, minH: 4 }
    },

    // 4. PREDICTIONS LIST
    {
      id: 'predictions-list',
      content: (
        <GridWidget title="Previsão de Faltas" icon={<Brain className="h-4 w-4" />} isDraggable={isEditable}>
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-2">
              {predictions.slice(0, 5).map((prediction) => (
                <div key={prediction.id} className="p-3 rounded-md border bg-card flex justify-between items-center">
                  <span className="text-xs truncate max-w-[120px]">Paciente #{prediction.patient_id.slice(0, 4)}</span>
                  <Badge variant={prediction.no_show_probability > 0.5 ? 'destructive' : 'secondary'} className="text-[10px] h-5">
                    {Math.round(prediction.no_show_probability * 100)}%
                  </Badge>
                </div>
              ))}
              {predictions.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">Sem previsões</div>}
            </div>
          </ScrollArea>
        </GridWidget>
      ),
      defaultLayout: { w: 4, h: 5, x: 0, y: 8, minW: 3, minH: 3 }
    },

    // 5. STAFF PERFORMANCE
    {
      id: 'staff-performance',
      content: (
        <GridWidget title="Performance da Equipe" icon={<BarChart3 className="h-4 w-4" />} isDraggable={isEditable}>
          <div className="h-full p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffPerformance.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="metric_date" hide />
                <Tooltip />
                <Bar dataKey="completed_appointments" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GridWidget>
      ),
      defaultLayout: { w: 4, h: 5, x: 4, y: 8, minW: 3, minH: 3 }
    },

    // 6. INVENTORY
    {
      id: 'inventory-list',
      content: (
        <GridWidget title="Estoque Baixo" icon={<Package className="h-4 w-4" />} isDraggable={isEditable}>
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-2">
              {lowStockItems.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-4">Estoque OK</div>
              ) : (
                lowStockItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-2 border rounded-md bg-destructive/5 border-destructive/20">
                    <span className="text-xs font-medium truncate">{item.item_name}</span>
                    <span className="text-xs text-destructive font-bold">{item.current_quantity} left</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </GridWidget>
      ),
      defaultLayout: { w: 4, h: 5, x: 8, y: 8, minW: 3, minH: 3 }
    }
  ];

  /* ==========================================================================================
   * RENDER
   * ========================================================================================== */
  return (
    <MainLayout maxWidth="7xl">
      <div className="space-y-6 pb-20">
        {/* Header - Enhanced Design */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                <Brain className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center ring-2 ring-background">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                Dashboard Inteligente
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isEditable ? 'Modo de Edição - Arraste e redimensione os widgets' : 'Análises preditivas e insights em tempo real'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {isEditable ? (
              <>
                <Button variant="outline" onClick={() => setIsEditable(false)} size="sm">
                  Cancelar
                </Button>
                <Button onClick={() => handleSaveLayout(savedLayout)} size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Layout
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
          rowHeight={60}
        />
      </div>
    </MainLayout>
  );
}
