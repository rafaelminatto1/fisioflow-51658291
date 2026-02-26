import React, { useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar, Users, DollarSign, Clock, UserCheck, AlertCircle,
  TrendingUp, Activity,
  CalendarDays, XCircle
} from 'lucide-react';
import { EventosStatsWidget } from '@/components/eventos/EventosStatsWidget';
import { useNavigate } from 'react-router-dom';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { AIInsightsWidget } from './AIInsightsWidget';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { LazyWidget } from './LazyWidget';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AdminDashboardProps {
  period?: string;
}

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

// Custom Tooltip Component for Charts
const CustomChartTooltip = React.memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border/40 bg-white/95 dark:bg-slate-950/95 p-3.5 shadow-premium-lg backdrop-blur-md animate-scale-in">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 px-1 border-b border-border/40 pb-2">{label}</p>
        <div className="space-y-2.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6 px-1">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-2.5 w-2.5 rounded-full shadow-sm ring-1 ring-white/20"
                  style={{ 
                    backgroundColor: entry.color,
                    boxShadow: `0 0 10px ${entry.color}40`
                  }}
                />
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{entry.name}</span>
              </div>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {typeof entry.value === 'number' && entry.name.toLowerCase().includes('receita') 
                  ? `R$ ${entry.value.toLocaleString('pt-BR')}`
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
});

CustomChartTooltip.displayName = 'CustomChartTooltip';

const AnimatedCard = React.memo(({ children, delay = 0, className = '' }: AnimatedCardProps) => (
  <div
    className={cn("animate-fade-in-up", className)}
    style={{
      animationDelay: `${delay}ms`,
      animationFillMode: 'both'
    }}
  >
    {children}
  </div>
));

AnimatedCard.displayName = 'AnimatedCard';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ period: _period = 'hoje' }) => {
  const navigate = useNavigate();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();

  const formattedRevenue = useMemo(() => {
    const revenue = metrics?.receitaMensal || 0;
    return revenue >= 1000
      ? `R$ ${(revenue / 1000).toFixed(1)}k`
      : `R$ ${revenue.toLocaleString('pt-BR')}`;
  }, [metrics?.receitaMensal]);

  const maxAtendimentos = useMemo(() => {
    return Math.max(...(metrics?.receitaPorFisioterapeuta?.map(f => f.atendimentos) || [1]), 1);
  }, [metrics?.receitaPorFisioterapeuta]);

  const statusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'confirmado': return 'default';
      case 'pendente': return 'secondary';
      case 'cancelado': return 'destructive';
      case 'concluido': return 'outline';
      default: return 'default';
    }
  };

  const appointmentsLoading = false;
  const agendamentosProximos = useMemo(() => [], []);

  const loading = metricsLoading || appointmentsLoading;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-10">
      {/* AI Insights - Inteligência de Dados */}
      <section className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
        <div className="relative">
          <AIInsightsWidget metrics={metrics} />
        </div>
      </section>

      {/* Cards de Estatísticas Principais */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="h-40 animate-pulse bg-muted/20 border-border/40 rounded-3xl" />
          ))}
        </div>
      ) : (
        <section aria-label="Métricas principais" data-testid="stats-cards">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Pacientes Ativos */}
            <AnimatedCard delay={0}>
              <Card className="rounded-[2.5rem] border-border/40 shadow-premium-sm hover:shadow-premium-lg transition-all duration-500 group overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md relative h-full">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                <CardHeader className="pb-2 px-6 pt-6 relative z-10">
                  <CardTitle className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-primary transition-colors">
                    <span>Pacientes Ativos</span>
                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-border/50 group-hover:border-primary/50 group-hover:shadow-primary/10 transition-all duration-500">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 relative z-10">
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:scale-105 origin-left transition-transform duration-500">{metrics?.pacientesAtivos || 0}</p>
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-none font-black px-2.5 py-0.5 rounded-full">
                      +{metrics?.pacientesNovos || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Base total: {metrics?.totalPacientes || 0}</p>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Ocupação */}
            <AnimatedCard delay={100}>
              <Card className="rounded-[2.5rem] border-border/40 shadow-premium-sm hover:shadow-premium-lg transition-all duration-500 group overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md relative h-full">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
                <CardHeader className="pb-2 px-6 pt-6 relative z-10">
                  <CardTitle className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-500 transition-colors">
                    <span>Ocupação Hoje</span>
                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-border/50 group-hover:border-blue-500/50 group-hover:shadow-blue-500/10 transition-all duration-500">
                      <Calendar className="h-4 w-4 text-blue-500" />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 relative z-10">
                  <div className="flex items-baseline gap-2 mb-3">
                    <p className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:scale-105 origin-left transition-transform duration-500">{metrics?.taxaOcupacao || 0}%</p>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">{metrics?.agendamentosHoje || 0} SLOTS</span>
                  </div>
                  <div className="bg-slate-200/50 dark:bg-slate-800/50 rounded-full h-2 overflow-hidden shadow-inner ring-1 ring-border/20">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${metrics?.taxaOcupacao || 0}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Receita */}
            <AnimatedCard delay={200}>
              <Card className="rounded-[2.5rem] border-border/40 shadow-premium-sm hover:shadow-premium-lg transition-all duration-500 group overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md relative h-full">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
                <CardHeader className="pb-2 px-6 pt-6 relative z-10">
                  <CardTitle className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-emerald-500 transition-colors">
                    <span>Receita Mensal</span>
                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-border/50 group-hover:border-emerald-500/50 group-hover:shadow-emerald-500/10 transition-all duration-500">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 relative z-10">
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:scale-105 origin-left transition-transform duration-500">{formattedRevenue}</p>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] font-black px-2.5 py-0.5 rounded-full border-none",
                        metrics?.crescimentoMensal && metrics.crescimentoMensal >= 0 
                          ? 'bg-emerald-500/10 text-emerald-600' 
                          : 'bg-red-500/10 text-red-600'
                      )}
                    >
                      {metrics?.crescimentoMensal && metrics.crescimentoMensal >= 0 ? '↑' : '↓'} {Math.abs(metrics?.crescimentoMensal || 0)}%
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Prev: R$ {metrics?.receitaMesAnterior?.toLocaleString('pt-BR') || 0}</p>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* No-Show */}
            <AnimatedCard delay={300}>
              <Card className="rounded-[2.5rem] border-border/40 shadow-premium-sm hover:shadow-premium-lg transition-all duration-500 group overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md relative h-full">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors" />
                <CardHeader className="pb-2 px-6 pt-6 relative z-10">
                  <CardTitle className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-amber-500 transition-colors">
                    <span>Taxa No-Show</span>
                    <div className={cn(
                      "p-2.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-border/50 group-hover:shadow-amber-500/10 transition-all duration-500",
                      (metrics?.taxaNoShow || 0) > 15 ? 'group-hover:border-red-500/50' : 'group-hover:border-amber-500/50'
                    )}>
                      <XCircle className={cn(
                        "h-4 w-4",
                        (metrics?.taxaNoShow || 0) > 15 ? 'text-red-500' : 'text-amber-500'
                      )} />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 relative z-10">
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:scale-105 origin-left transition-transform duration-500">{metrics?.taxaNoShow || 0}%</p>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-border/50 px-2 py-0 bg-slate-50 dark:bg-slate-800">
                      META 10%
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Média móvel (30 dias)</p>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>
        </section>
      )}

      {/* Estatísticas de Eventos */}
      <section className="animate-slide-up-fade" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Estatísticas de Eventos</h2>
        </div>
        <LazyWidget height={150}>
          <EventosStatsWidget />
        </LazyWidget>
      </section>

      {/* Gráficos e Desempenho */}
      <section aria-label="Gráficos e desempenho">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Tendência Semanal */}
          <AnimatedCard delay={500}>
            <Card className="rounded-[2rem] border-border/40 shadow-premium-sm hover:shadow-premium-md transition-all duration-300 overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="flex items-center gap-3 text-sm font-bold tracking-tight">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  Tendência Semanal
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="h-[250px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {!metrics?.tendenciaSemanal || metrics.tendenciaSemanal.length === 0 ? (
                      <EmptyStateEnhanced
                        icon={TrendingUp}
                        title="Sem dados semanais"
                        description="Aguardando os primeiros agendamentos."
                        className="py-10"
                      />
                    ) : (
                      <BarChart data={metrics.tendenciaSemanal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="dia"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 'bold' }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 'bold' }}
                          width={40}
                        />
                        <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.2 }} />
                        <Bar dataKey="agendamentos" name="Agendamentos" radius={[6, 6, 0, 0]} fill="url(#primaryGradient)" barSize={20} />
                        <Bar dataKey="concluidos" name="Concluídos" radius={[6, 6, 0, 0]} fill="url(#successGradient)" barSize={20} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Desempenho por Profissional */}
          <AnimatedCard delay={600}>
            <Card className="rounded-[2rem] border-border/40 shadow-premium-sm hover:shadow-premium-md transition-all duration-300 overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="flex items-center gap-3 text-sm font-bold tracking-tight">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  Ranking de Desempenho
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="mt-2 h-[250px] overflow-y-auto pr-2 scrollbar-hide">
                  {(metrics?.receitaPorFisioterapeuta?.length || 0) === 0 ? (
                    <EmptyStateEnhanced
                      icon={UserCheck}
                      title="Nenhum atendimento"
                      description="Dados de desempenho em breve."
                      className="py-10"
                    />
                  ) : (
                    <div className="space-y-6">
                      {metrics?.receitaPorFisioterapeuta.map((fisio, index) => (
                        <div key={fisio.id} className="group/item">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black",
                                index === 0 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              )}>
                                {index + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover/item:text-primary transition-colors">{fisio.nome}</span>
                            </div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              R$ {fisio.receita.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                              <div 
                                className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${(fisio.atendimentos / maxAtendimentos) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter w-16 text-right">
                              {fisio.atendimentos} ATEND.
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </section>

      {/* Seção de Agendamentos e Ações Rápidas */}
      <section aria-label="Agendamentos e ações rápidas">
        <div className="grid gap-6 md:grid-cols-7">
          {/* Agendamentos Próximos */}
          <AnimatedCard delay={700} className="md:col-span-4">
            <Card className="rounded-[2rem] border-border/40 shadow-premium-sm hover:shadow-premium-md transition-all duration-300 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden h-full">
              <CardHeader className="pb-4 px-6 pt-6 border-b border-border/10 bg-slate-50/50 dark:bg-slate-800/20">
                <CardTitle className="flex items-center justify-between text-sm font-bold tracking-tight">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    Agenda do Dia
                  </div>
                  <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-3 h-8 rounded-full" onClick={() => navigate('/agenda')}>
                    Ver Todos
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {appointmentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
                  </div>
                ) : agendamentosProximos.length === 0 ? (
                  <EmptyStateEnhanced
                    icon={Clock}
                    title="Agenda livre"
                    description="Não há compromissos para hoje."
                    actionLabel="Agendar Agora"
                    onAction={() => navigate('/agenda')}
                    className="py-12"
                  />
                ) : (
                  <div className="space-y-3">
                    {agendamentosProximos.map((agendamento) => (
                      <div
                        key={agendamento.id}
                        className="flex items-center justify-between p-4 bg-white/60 dark:bg-slate-800/60 border border-border/40 rounded-2xl hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => navigate('/agenda')}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-xs font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl shadow-sm">
                            {agendamento.horario}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                              {agendamento.paciente}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium">Atendimento Clínico</p>
                          </div>
                        </div>
                        <Badge variant={statusBadgeVariant(agendamento.status)} className="text-[9px] font-black uppercase tracking-wider rounded-lg px-2 shadow-sm border-none">
                          {agendamento.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Ações Rápidas */}
          <AnimatedCard delay={800} className="md:col-span-3">
            <Card className="rounded-[2rem] border-border/40 shadow-premium-sm hover:shadow-premium-md transition-all duration-300 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden h-full">
              <CardHeader className="pb-4 px-6 pt-6 border-b border-border/10 bg-slate-50/50 dark:bg-slate-800/20">
                <CardTitle className="text-sm font-bold tracking-tight">Atalhos do Gestor</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Button
                  className="w-full justify-between bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-14 rounded-2xl px-6 group"
                  onClick={() => navigate('/pacientes')}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5" />
                    <span className="font-bold">Novo Paciente</span>
                  </div>
                  <div className="bg-white/20 p-1 rounded-lg group-hover:translate-x-1 transition-transform">
                    <TrendingUp className="h-4 w-4 rotate-90" />
                  </div>
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button className="flex flex-col items-center justify-center gap-2 h-24 rounded-2xl bg-white/60 dark:bg-slate-800/60 border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all group" variant="outline" onClick={() => navigate('/agenda')}>
                    <Calendar className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Agenda</span>
                  </Button>
                  <Button className="flex flex-col items-center justify-center gap-2 h-24 rounded-2xl bg-white/60 dark:bg-slate-800/60 border-border/40 hover:border-accent/40 hover:bg-accent/5 transition-all group" variant="outline" onClick={() => navigate('/eventos')}>
                    <CalendarDays className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Eventos</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button className="flex flex-col items-center justify-center gap-2 h-24 rounded-2xl bg-white/60 dark:bg-slate-800/60 border-border/40 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group" variant="outline" onClick={() => navigate('/relatorios')}>
                    <TrendingUp className="h-6 w-6 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">B.I.</span>
                  </Button>
                  <Button className="flex flex-col items-center justify-center gap-2 h-24 rounded-2xl bg-white/60 dark:bg-slate-800/60 border-border/40 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group" variant="outline" onClick={() => navigate('/financeiro')}>
                    <DollarSign className="h-6 w-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Finanças</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </section>
    </div>
  );
};

// Custom comparison for AdminDashboard memoization
function adminDashboardAreEqual(prev: AdminDashboardProps, next: AdminDashboardProps) {
  return prev.period === next.period;
}

export default memo(AdminDashboard, adminDashboardAreEqual);
AdminDashboard.displayName = 'AdminDashboard';
