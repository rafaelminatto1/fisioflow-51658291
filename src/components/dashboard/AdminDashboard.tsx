import React, { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar, Users, DollarSign, Clock, UserCheck, AlertCircle,
  TrendingUp, TrendingDown, UserX, Activity, Target,
  CalendarDays, XCircle
} from 'lucide-react';
import { EventosStatsWidget } from '@/components/eventos/EventosStatsWidget';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useQuery } from '@tanstack/react-query';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, TooltipProps } from 'recharts';

// Custom Tooltip Component for Charts - memoized for performance
const CustomChartTooltip = React.memo(({ active, payload, label }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-md">
        <p className="text-sm font-medium mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
              <span className="text-sm font-semibold">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
});

CustomChartTooltip.displayName = 'CustomChartTooltip';

// Animated Card Wrapper for staggered animations - memoized for performance
interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const AnimatedCard = React.memo(({ children, delay = 0, className = '' }: AnimatedCardProps) => (
  <div
    className={`animate-fade-in-up ${className}`}
    style={{
      animationDelay: `${delay}ms`,
      animationFillMode: 'both'
    }}
  >
    {children}
  </div>
));

AnimatedCard.displayName = 'AnimatedCard';

interface AdminDashboardProps {
  period?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ period: _period = 'hoje' }) => {
  const navigate = useNavigate();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();

  // Memoize expensive calculations
  const occupancyRate = useMemo(() => {
    if (!metrics?.agendamentosHoje) return 0;
    const total = metrics.agendamentosHoje + (metrics.agendamentosRestantes || 0);
    return total > 0 ? Math.round((metrics.agendamentosHoje / total) * 100) : 0;
  }, [metrics?.agendamentosHoje, metrics?.agendamentosRestantes]);

  const formattedRevenue = useMemo(() => {
    const revenue = metrics?.receitaMensal || 0;
    return revenue >= 1000
      ? `${(revenue / 1000).toFixed(1)}k`
      : revenue.toLocaleString('pt-BR');
  }, [metrics?.receitaMensal]);

  const maxAtendimentos = useMemo(() => {
    return Math.max(...(metrics?.receitaPorFisioterapeuta?.map(f => f.atendimentos) || [1]), 1);
  }, [metrics?.receitaPorFisioterapeuta]);

  // Stable navigation callbacks
  // const handleNavigate = useCallback((path: string) => {
  //   navigate(path);
  // }, [navigate]);

  // Próximos agendamentos - otimizado com cache
  const { data: agendamentosProximos = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['proximos-agendamentos'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          appointment_date,
          status,
          type,
          patients!inner(full_name)
        `)
        .gte('appointment_date', today)
        .order('appointment_date')
        .order('appointment_time')
        .limit(4);

      return data?.map(apt => ({
        id: apt.id,
        paciente: (apt.patients as unknown as { full_name?: string; name?: string })?.full_name || (apt.patients as unknown as { name?: string })?.name || 'Paciente',
        horario: apt.appointment_time,
        status: apt.status
      })) || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 5, // 5 minutos
  });

  const statusBadgeVariant = useCallback((status: string) => {
    switch (status) {
      case 'confirmado': return 'default';
      case 'pendente': case 'aguardando_confirmacao': return 'secondary';
      case 'cancelado': return 'destructive';
      case 'concluido': return 'outline';
      default: return 'default';
    }
  }, []);

  const loading = metricsLoading || appointmentsLoading;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Estatísticas de Eventos */}
      <section>
        <h2 className="text-lg md:text-xl font-semibold mb-4">Estatísticas de Eventos</h2>
        <EventosStatsWidget />
      </section>

      {/* Cards de Estatísticas Principais */}
      {loading ? (
        <LoadingSkeleton type="stats" rows={4} />
      ) : (
        <section aria-label="Métricas principais">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            <AnimatedCard delay={0}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                    <span className="text-muted-foreground">Pacientes Ativos</span>
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight" aria-live="polite">{metrics?.totalPacientes || 0}</p>
                    <Badge variant="secondary" className="text-xs sm:text-sm font-medium bg-success/10 text-success hover:bg-success/20 border-success/20">
                      <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                      +{metrics?.pacientesNovos || 0}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={50}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                    <span className="text-muted-foreground">Ocupação</span>
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight" aria-live="polite">
                      {occupancyRate}%
                    </p>
                    <Badge variant="outline" className="text-xs sm:text-sm font-medium">
                      {(metrics?.agendamentosHoje || 0) + (metrics?.agendamentosRestantes || 0)} total
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={100}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                    <span className="text-muted-foreground">Receita Mensal</span>
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight" aria-live="polite">
                      {formattedRevenue}
                    </p>
                    {(metrics?.crescimentoMensal || 0) >= 0 ? (
                      <Badge variant="secondary" className="text-xs sm:text-sm font-medium bg-success/10 text-success hover:bg-success/20 border-success/20">
                        <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                        +{metrics?.crescimentoMensal || 0}%
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs sm:text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20">
                        <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                        {metrics?.crescimentoMensal || 0}%
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={150}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                    <span className="text-muted-foreground">Taxa de No-Show</span>
                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight" aria-live="polite">{metrics?.taxaNoShow || 0}%</p>
                    <Badge variant="outline" className="text-xs sm:text-sm font-medium">
                      meta: 0%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>
        </section>
      )}

      {/* Métricas Avançadas */}
      <section aria-label="Métricas avançadas">
        <div className="grid gap-4 md:gap-5 grid-cols-2 lg:grid-cols-4">
          <AnimatedCard delay={200}>
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                  <span className="text-muted-foreground">Taxa de No-Show</span>
                  {metricsLoading ? (
                    <div className="h-4 w-4 sm:h-5 sm:w-5 bg-muted animate-pulse rounded" />
                  ) : (
                    <UserX className={`h-4 w-4 sm:h-5 sm:w-5 ${(metrics?.taxaNoShow || 0) > 10 ? 'text-destructive' : 'text-success'}`} />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                {metricsLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                      <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight" aria-live="polite">{metrics?.taxaNoShow || 0}%</p>
                      <Badge variant="outline" className="text-xs sm:text-sm font-medium">
                        meta: 0%
                      </Badge>
                    </div>
                    <CardDescription className="mt-2 text-xs">
                      {(metrics?.taxaNoShow || 0) > 10 ? 'Acima da meta recomendada' : 'Dentro da meta ideal'}
                    </CardDescription>
                  </>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={250}>
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                  <span className="text-muted-foreground">Pacientes Ativos</span>
                  {metricsLoading ? (
                    <div className="h-4 w-4 sm:h-5 sm:w-5 bg-muted animate-pulse rounded" />
                  ) : (
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                {metricsLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight" aria-live="polite">{metrics?.pacientesAtivos || 0}</p>
                    <CardDescription className="mt-2 text-xs">
                      Com atendimentos nos últimos 30 dias
                    </CardDescription>
                  </>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={300}>
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                  <span className="text-muted-foreground">Agendamentos Semanais</span>
                  {metricsLoading ? (
                    <div className="h-4 w-4 sm:h-5 sm:w-5 bg-muted animate-pulse rounded" />
                  ) : (
                    <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                {metricsLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-36 bg-muted animate-pulse rounded" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight" aria-live="polite">{metrics?.agendamentosSemana || 0}</p>
                    <CardDescription className="mt-2 text-xs">
                      Total de sessões agendadas esta semana
                    </CardDescription>
                  </>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={350}>
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                  <span className="text-muted-foreground">Cancelamentos</span>
                  {metricsLoading ? (
                    <div className="h-4 w-4 sm:h-5 sm:w-5 bg-muted animate-pulse rounded" />
                  ) : (
                    <XCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${(metrics?.cancelamentosSemana || 0) > 3 ? 'text-warning' : 'text-muted-foreground'}`} />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                {metricsLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-28 bg-muted animate-pulse rounded" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                      <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight" aria-live="polite">{metrics?.cancelamentosSemana || 0}</p>
                      <Badge variant="secondary" className={`text-xs sm:text-sm font-medium ${(metrics?.cancelamentosSemana || 0) > 3 ? 'bg-warning/10 text-warning hover:bg-warning/20 border-warning/20' : ''}`}>
                        esta semana
                      </Badge>
                    </div>
                    <CardDescription className="mt-2 text-xs">
                      {(metrics?.cancelamentosSemana || 0) > 3 ? 'Atenção: alto índice de cancelamentos' : 'Taxa de cancelamento normal'}
                    </CardDescription>
                  </>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </section>

      {/* Gráfico de Tendência Semanal e Receita por Fisioterapeuta */}
      <section aria-label="Gráficos e desempenho">
        <div className="grid gap-4 md:gap-5 md:grid-cols-2">
          {/* Tendência Semanal */}
          <AnimatedCard delay={400}>
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                <CardTitle className="flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg font-medium">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  Tendência Semanal
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                {metricsLoading ? (
                  <LoadingSkeleton type="card" rows={1} />
                ) : !metrics?.tendenciaSemanal || metrics.tendenciaSemanal.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2">
                      Sem dados para exibir
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Os dados de tendência aparecerão aqui após os primeiros agendamentos da semana
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180} className="xs:height-[200px]">
                    <BarChart data={metrics.tendenciaSemanal} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <XAxis
                        dataKey="dia"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        interval={0}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        width={28}
                      />
                      <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }} />
                      <Bar dataKey="agendamentos" name="Agendamentos" radius={[4, 4, 0, 0]}>
                        {metrics.tendenciaSemanal.map((_, index) => (
                          <Cell key={index} fill="hsl(var(--primary))" opacity={0.7} />
                        ))}
                      </Bar>
                      <Bar dataKey="concluidos" name="Concluídos" radius={[4, 4, 0, 0]}>
                        {metrics.tendenciaSemanal.map((_, index) => (
                          <Cell key={index} fill="hsl(var(--success))" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Desempenho por Profissional */}
          <AnimatedCard delay={450}>
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                <CardTitle className="flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg font-medium">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                  </div>
                  Desempenho por Profissional
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                {metricsLoading ? (
                  <LoadingSkeleton type="list" rows={3} />
                ) : (metrics?.receitaPorFisioterapeuta?.length || 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <UserCheck className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2">
                      Nenhum atendimento registrado
                    </h3>
                    <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                      Os dados de desempenho aparecerão aqui após os primeiros atendimentos do mês
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-medium"
                      onClick={() => navigate('/agenda')}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Criar Agendamento
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {metrics?.receitaPorFisioterapeuta.map((fisio, index) => (
                      <div key={fisio.id} className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${index === 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              #{index + 1}
                            </span>
                            <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-none">{fisio.nome}</span>
                          </div>
                          <span className="text-sm font-bold text-success">
                            R$ {fisio.receita.toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={(fisio.atendimentos / maxAtendimentos) * 100}
                            className="h-2.5 flex-1"
                            aria-label={`${fisio.nome}: ${fisio.atendimentos} atendimentos`}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                            {fisio.atendimentos} atend.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </section>

      {/* Métricas de Ocupação e Risco */}
      <section aria-label="Métricas de ocupação e risco">
        <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-3">
          <AnimatedCard delay={500}>
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                  <span className="text-muted-foreground">Taxa de Ocupação</span>
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight" aria-live="polite">{metrics?.taxaOcupacao || 0}%</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">da capacidade</span>
                  </div>
                  <div className="space-y-2">
                    <Progress value={metrics?.taxaOcupacao || 0} className="h-2.5" aria-label={`Taxa de ocupação: ${metrics?.taxaOcupacao || 0}%`} />
                    <CardDescription className="text-xs">
                      {metrics?.taxaOcupacao >= 80 ? 'Alta ocupação' : metrics?.taxaOcupacao >= 50 ? 'Ocupação moderada' : 'Baixa ocupação'}
                    </CardDescription>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={550}>
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                  <span className="text-muted-foreground">Média Sessões/Paciente</span>
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                <div className="space-y-3">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight" aria-live="polite">{metrics?.mediaSessoesPorPaciente || 0}</span>
                  <CardDescription className="text-xs">
                    Média de sessões por paciente nos últimos 30 dias
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={600}>
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                  <span className="text-muted-foreground">Pacientes em Risco</span>
                  <AlertCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${(metrics?.pacientesEmRisco || 0) > 5 ? 'text-warning' : 'text-muted-foreground'}`} />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                    <span className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${(metrics?.pacientesEmRisco || 0) > 5 ? 'text-warning' : ''}`} aria-live="polite">
                      {metrics?.pacientesEmRisco || 0}
                    </span>
                    {(metrics?.pacientesEmRisco || 0) > 5 && (
                      <Badge variant="secondary" className="text-xs sm:text-sm font-medium bg-warning/10 text-warning hover:bg-warning/20 border-warning/20">
                        Atenção
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    Pacientes sem consulta há mais de 30 dias
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </section>

      {/* Seção de Agendamentos e Ações Rápidas */}
      <section aria-label="Agendamentos e ações rápidas">
        <div className="grid gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-7">
          {/* Agendamentos Próximos */}
          <AnimatedCard delay={650} className="lg:col-span-4">
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                <CardTitle className="flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg font-medium">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  Próximos Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                {appointmentsLoading ? (
                  <LoadingSkeleton type="list" rows={3} />
                ) : agendamentosProximos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2">
                      Nenhum agendamento próximo
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                      Comece adicionando agendamentos para ver sua agenda aqui
                    </p>
                    <Button
                      className="rounded-xl font-medium"
                      onClick={() => navigate('/agenda')}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Criar Agendamento
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 sm:space-y-4" role="list" aria-label="Lista de agendamentos próximos">
                      {agendamentosProximos.map((agendamento) => (
                        <div
                          key={agendamento.id}
                          role="listitem"
                          className="flex items-center justify-between p-3.5 sm:p-4 border border-border/50 rounded-xl hover:bg-accent/50 hover:border-accent/50 transition-all duration-200 cursor-pointer group"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && navigate('/agenda')}
                        >
                          <div className="flex items-center space-x-3 sm:space-x-4">
                            <div className="text-xs sm:text-sm font-bold text-primary bg-primary/10 px-2.5 sm:px-3 py-1.5 rounded-lg min-w-[60px] text-center">
                              {agendamento.horario}
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">
                                {agendamento.paciente}
                              </p>
                            </div>
                          </div>
                          <Badge variant={statusBadgeVariant(agendamento.status)} className="text-xs font-medium px-2.5 py-1">
                            {agendamento.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 sm:mt-6">
                      <Button
                        variant="outline"
                        className="w-full hover:bg-accent/80 border-border/50 font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        onClick={() => navigate('/agenda')}
                      >
                        Ver Todos os Agendamentos
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Ações Rápidas */}
          <AnimatedCard delay={700} className="lg:col-span-3">
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                <CardTitle className="text-base sm:text-lg font-medium">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6 space-y-3">
                <Button
                  className="w-full justify-start bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-md text-sm sm:text-base font-medium h-12 sm:h-13 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => navigate('/pacientes')}
                >
                  <Users className="mr-3 h-5 w-5" />
                  Novo Paciente
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button className="justify-start text-sm font-medium h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" variant="outline" onClick={() => navigate('/agenda')}>
                    <Calendar className="mr-2 h-4 w-4 text-primary" />
                    Agendar
                  </Button>
                  <Button className="justify-start text-sm font-medium h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" variant="outline" onClick={() => navigate('/eventos')}>
                    <CalendarDays className="mr-2 h-4 w-4 text-accent" />
                    Eventos
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button className="justify-start text-sm font-medium h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" variant="outline" onClick={() => navigate('/relatorios')}>
                    <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                    Relatórios
                  </Button>
                  <Button className="justify-start text-sm font-medium h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" variant="outline" onClick={() => navigate('/financeiro')}>
                    <DollarSign className="mr-2 h-4 w-4 text-success" />
                    Financeiro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </section>

      {/* Alertas e Notificações */}
      <section aria-label="Alertas e notificações">
        <AnimatedCard delay={750}>
          <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
              <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-medium">
                <AlertCircle className="h-5 w-5 text-warning" />
                Alertas e Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
              <div className="space-y-3" role="list" aria-label="Alertas e notificações do sistema">
                {(metrics?.pacientesEmRisco || 0) > 0 && (
                  <div
                    role="listitem"
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl"
                  >
                    <AlertCircle className="h-5 w-5 text-warning shrink-0" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{metrics?.pacientesEmRisco} pacientes sem consulta há mais de 30 dias</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Considere entrar em contato para reativação</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/pacientes')}
                      className="w-full sm:w-auto font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Ver Pacientes
                    </Button>
                  </div>
                )}
                {(metrics?.taxaNoShow || 0) > 10 && (
                  <div
                    role="listitem"
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl"
                  >
                    <UserX className="h-5 w-5 text-destructive shrink-0" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Taxa de no-show acima do ideal ({metrics?.taxaNoShow}%)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Reforce os lembretes de confirmação</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/comunicacao')}
                      className="w-full sm:w-auto font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Configurar
                    </Button>
                  </div>
                )}
                <div
                  role="listitem"
                  className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-xl"
                >
                  <Activity className="h-5 w-5 text-success" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Sistema funcionando normalmente</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Última atualização: agora</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      </section>
    </div>
  );
};

export default AdminDashboard;
