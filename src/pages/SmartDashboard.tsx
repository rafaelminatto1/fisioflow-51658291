import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain, TrendingUp, AlertTriangle, Users, DollarSign,
  Calendar, BarChart3, CheckCircle,
  MessageSquare, Sparkles, Trophy, Package, LineChart as LineChartIcon
} from 'lucide-react';
import { useAppointmentPredictions, useRevenueForecasts, useStaffPerformance, useInventory } from '@/hooks/useInnovations';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from 'recharts';

export default function SmartDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

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
      icon: Calendar,
      label: 'Hoje',
      value: todayAppointments.length,
      subLabel: 'agendamentos',
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-500/15 to-teal-500/10',
      borderColor: 'border-emerald-500/30',
      show: true,
    },
    {
      icon: CheckCircle,
      label: 'Realizados',
      value: completedToday,
      subLabel: `de ${todayAppointments.length}`,
      gradient: 'from-blue-500 to-indigo-500',
      bgGradient: 'from-blue-500/15 to-indigo-500/10',
      borderColor: 'border-blue-500/30',
      show: true,
    },
    {
      icon: AlertTriangle,
      label: 'Risco Alto',
      value: highRiskAppointments.length,
      subLabel: 'faltas previstas',
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-500/15 to-orange-500/10',
      borderColor: 'border-amber-500/30',
      show: true,
    },
    {
      icon: Users,
      label: 'Pacientes',
      value: activePatients,
      subLabel: 'em tratamento',
      gradient: 'from-purple-500 to-violet-500',
      bgGradient: 'from-purple-500/15 to-violet-500/10',
      borderColor: 'border-purple-500/30',
      show: true,
    },
    {
      icon: Package,
      label: 'Estoque',
      value: lowStockItems.length,
      subLabel: 'itens baixos',
      gradient: 'from-rose-500 to-pink-500',
      bgGradient: 'from-rose-500/15 to-pink-500/10',
      borderColor: 'border-rose-500/30',
      show: true,
    },
    {
      icon: TrendingUp,
      label: 'Novos',
      value: newPatientsThisMonth,
      subLabel: 'este mês',
      gradient: 'from-cyan-500 to-sky-500',
      bgGradient: 'from-cyan-500/15 to-sky-500/10',
      borderColor: 'border-cyan-500/30',
      show: true,
    },
  ];

  return (
    <MainLayout maxWidth="7xl">
      <div className="space-y-6">
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
                Análises preditivas e insights em tempo real
              </p>
            </div>
          </div>
          <Badge className="w-fit bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 text-primary hover:bg-primary/20">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
            Powered by AI
          </Badge>
        </div>

        {/* Quick Stats - Enhanced Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {statsCards.map((stat, index) => (
            <Card
              key={index}
              className={`relative overflow-hidden bg-gradient-to-br ${stat.bgGradient} ${stat.borderColor} hover:shadow-lg transition-all duration-300 group`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-md`}>
                    <stat.icon className="h-4.5 w-4.5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.subLabel}</p>
              </CardContent>
              {/* Decorative gradient overlay */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </Card>
          ))}
        </div>

        {/* Tabs - Full Width */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full max-w-2xl grid grid-cols-4 h-11 p-1 bg-muted/50 backdrop-blur-sm">
            <TabsTrigger value="overview" className="text-xs sm:text-sm data-[state=active]:shadow-sm">
              <LineChartIcon className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="predictions" className="text-xs sm:text-sm data-[state=active]:shadow-sm">
              <Brain className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Previsões
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs sm:text-sm data-[state=active]:shadow-sm">
              <Package className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Estoque
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Forecast Chart */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-emerald-500" />
                        </div>
                        Previsão de Receita
                      </CardTitle>
                      <CardDescription className="mt-1.5">Comparação entre previsão e receita real</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[280px]">
                    {revenueChartData.length > 0 ? (
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
                          <Tooltip
                            formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Area type="monotone" dataKey="previsao" stroke="#3B82F6" strokeWidth={2} fill="url(#colorPrevisao)" name="Previsão" />
                          <Area type="monotone" dataKey="real" stroke="#10B981" strokeWidth={2} fill="url(#colorReal)" name="Real" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <LineChartIcon className="h-12 w-12 mb-3 opacity-20" />
                        <p className="text-sm">Dados de previsão serão exibidos aqui</p>
                        <p className="text-xs mt-1">O sistema aprende com o histórico de receitas</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        Insights da IA
                      </CardTitle>
                      <CardDescription className="mt-1.5">Recomendações baseadas em dados</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ScrollArea className="h-[280px] pr-4">
                    <div className="space-y-3">
                      {highRiskAppointments.length > 0 && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                              <AlertTriangle className="h-4.5 w-4.5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-amber-600 dark:text-amber-400">Atenção: Risco de Faltas</p>
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {highRiskAppointments.length} agendamentos têm mais de 30% de chance de não comparecimento.
                                Considere enviar lembretes extras.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {lowStockItems.length > 0 && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/5 border border-rose-500/20">
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shrink-0">
                              <Package className="h-4.5 w-4.5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-rose-600 dark:text-rose-400">Estoque Baixo</p>
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {lowStockItems.length} itens abaixo do mínimo: {lowStockItems.slice(0, 2).map(i => i.item_name).join(', ')}
                                {lowStockItems.length > 2 && ` e mais ${lowStockItems.length - 2}...`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
                            <TrendingUp className="h-4.5 w-4.5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-emerald-600 dark:text-emerald-400">Tendência Positiva</p>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                              {newPatientsThisMonth} novos pacientes este mês. Continue investindo em marketing digital.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0">
                            <MessageSquare className="h-4.5 w-4.5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-blue-600 dark:text-blue-400">Engajamento WhatsApp</p>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                              Pacientes com exercícios via WhatsApp têm 40% mais adesão ao tratamento.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shrink-0">
                            <Trophy className="h-4.5 w-4.5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-purple-600 dark:text-purple-400">Gamificação</p>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                              Ative gamificação para aumentar a retenção de pacientes em até 25%.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* No-Show Predictions */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </div>
                    Previsão de Faltas
                  </CardTitle>
                  <CardDescription className="mt-1.5">Agendamentos com maior risco de não comparecimento</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ScrollArea className="h-[350px] pr-4">
                    <div className="space-y-3">
                      {predictions.length === 0 ? (
                        <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                          <Brain className="h-12 w-12 mb-3 opacity-20" />
                          <p className="text-sm">Sem previsões disponíveis</p>
                          <p className="text-xs mt-1">O sistema aprende com o histórico</p>
                        </div>
                      ) : (
                        predictions.slice(0, 10).map((prediction) => (
                          <div
                            key={prediction.id}
                            className={`p-4 rounded-xl border transition-all hover:shadow-sm ${prediction.no_show_probability > 0.5
                                ? 'bg-gradient-to-br from-rose-500/10 to-pink-500/5 border-rose-500/20'
                                : prediction.no_show_probability > 0.3
                                  ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20'
                                  : 'bg-muted/30 border-border'
                              }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-sm truncate">Paciente #{prediction.patient_id.slice(0, 8)}</span>
                              <Badge
                                variant={prediction.no_show_probability > 0.5 ? 'destructive' : 'secondary'}
                                className="shrink-0"
                              >
                                {Math.round(prediction.no_show_probability * 100)}% risco
                              </Badge>
                            </div>
                            {prediction.risk_factors && prediction.risk_factors.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {prediction.risk_factors.slice(0, 3).map((factor, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {factor}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {prediction.recommended_actions && prediction.recommended_actions.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">
                                💡 {prediction.recommended_actions[0]}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Revenue Predictions */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                    </div>
                    Previsão de Receita
                  </CardTitle>
                  <CardDescription className="mt-1.5">Próximos 7 dias</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {[...Array(7)].map((_, i) => {
                      const date = addDays(new Date(), i);
                      const forecast = forecasts.find(f => f.forecast_date === format(date, 'yyyy-MM-dd'));
                      const predictedRevenue = forecast?.predicted_revenue || 0;
                      const maxRevenue = 5000;

                      return (
                        <div key={i} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className={`font-medium ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                              {i === 0 ? '📅 Hoje' : format(date, 'EEEE', { locale: ptBR })}
                            </span>
                            <span className="font-semibold tabular-nums">
                              R$ {predictedRevenue.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <Progress
                            value={(predictedRevenue / maxRevenue) * 100}
                            className={`h-2 ${i === 0 ? '[&>div]:bg-primary' : ''}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="mt-6 space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                  </div>
                  Performance da Equipe
                </CardTitle>
                <CardDescription className="mt-1.5">Métricas de desempenho dos profissionais</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {staffPerformance.length === 0 ? (
                  <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm">Dados de performance não disponíveis</p>
                    <p className="text-xs mt-1">As métricas são calculadas automaticamente ao final de cada dia</p>
                  </div>
                ) : (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={staffPerformance.slice(0, 30)}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
                        <XAxis dataKey="metric_date" className="text-xs" tick={{ fontSize: 11 }} />
                        <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar dataKey="completed_appointments" fill="#10B981" name="Realizados" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cancelled_appointments" fill="#F59E0B" name="Cancelados" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="no_show_appointments" fill="#EF4444" name="Faltas" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="mt-6 space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-rose-500" />
                  </div>
                  Controle de Estoque
                </CardTitle>
                <CardDescription className="mt-1.5">Itens que precisam de reposição</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {inventory.length === 0 ? (
                  <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm">Nenhum item cadastrado</p>
                    <p className="text-xs mt-1">Acesse a página de Estoque para adicionar itens</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inventory.map((item) => {
                      const percentage = (item.current_quantity / Math.max(item.minimum_quantity * 2, 1)) * 100;
                      const isLow = item.current_quantity <= item.minimum_quantity;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-xl border transition-all ${isLow
                              ? 'bg-gradient-to-br from-rose-500/10 to-pink-500/5 border-rose-500/20'
                              : 'bg-muted/30 border-border hover:shadow-sm'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-medium text-sm truncate ${isLow ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                                {item.item_name}
                              </span>
                              {isLow && (
                                <Badge variant="destructive" className="shrink-0 text-xs">Baixo</Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                              {item.current_quantity} / {item.minimum_quantity * 2} {item.unit}
                            </span>
                          </div>
                          <Progress
                            value={Math.min(percentage, 100)}
                            className={`h-2 ${isLow ? '[&>div]:bg-rose-500' : ''}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
