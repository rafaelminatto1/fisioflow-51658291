import React, { useMemo, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
import { AIInsightsWidget } from './AIInsightsWidget';
import { EmptyState } from '@/components/ui/EmptyState';
import { LazyWidget } from './LazyWidget';

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

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ period: _period = 'hoje' }) => {
  const navigate = useNavigate();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();

  // ... (useMemo calculations remain the same)

  // TODO: Add appointments query if needed
  const appointmentsLoading = false;
  const agendamentosProximos = useMemo(() => [], []);

  const loading = metricsLoading || appointmentsLoading;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* AI Insights - Inteligência de Dados */}
      <section>
        <AIInsightsWidget metrics={metrics} />
      </section>

      {/* Estatísticas de Eventos */}
      <section>
        <h2 className="text-lg md:text-xl font-semibold mb-4">Estatísticas de Eventos</h2>
        <LazyWidget height={150}>
          <EventosStatsWidget />
        </LazyWidget>
      </section>

      {/* Cards de Estatísticas Principais */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="h-32 animate-pulse bg-muted/50" />
          ))}
        </div>
      ) : (
        <section aria-label="Métricas principais">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {/* Pacientes Ativos */}
            <AnimatedCard delay={0}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
                <CardHeader className="pb-3 px-4 pt-4">
                  <CardTitle className="flex items-center justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Pacientes Ativos</span>
                    <Users className="h-5 w-5 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black tracking-tight">{metrics?.pacientesAtivos || 0}</p>
                    <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {metrics?.pacientesNovos || 0} novos
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Total: {metrics?.totalPacientes || 0}</p>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Ocupação */}
            <AnimatedCard delay={50}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
                <CardHeader className="pb-3 px-4 pt-4">
                  <CardTitle className="flex items-center justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Ocupação Hoje</span>
                    <Calendar className="h-5 w-5 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black tracking-tight">{metrics?.taxaOcupacao || 0}%</p>
                    <Badge variant="outline" className="text-xs">
                      {metrics?.agendamentosHoje || 0} agend.
                    </Badge>
                  </div>
                  <Progress value={metrics?.taxaOcupacao || 0} className="h-1.5 mt-2" />
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Receita */}
            <AnimatedCard delay={100}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
                <CardHeader className="pb-3 px-4 pt-4">
                  <CardTitle className="flex items-center justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Receita Mensal</span>
                    <DollarSign className="h-5 w-5 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black tracking-tight">{formattedRevenue}</p>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${metrics?.crescimentoMensal && metrics.crescimentoMensal >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
                    >
                      {metrics?.crescimentoMensal && metrics.crescimentoMensal >= 0 ? '+' : ''}{metrics?.crescimentoMensal || 0}%
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">vs mês anterior: R$ {metrics?.receitaMesAnterior?.toLocaleString('pt-BR') || 0}</p>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* No-Show */}
            <AnimatedCard delay={150}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
                <CardHeader className="pb-3 px-4 pt-4">
                  <CardTitle className="flex items-center justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Taxa No-Show</span>
                    <XCircle className={`h-5 w-5 ${(metrics?.taxaNoShow || 0) > 15 ? 'text-destructive' : 'text-muted-foreground'}`} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black tracking-tight">{metrics?.taxaNoShow || 0}%</p>
                    <Badge variant="outline" className="text-xs">
                      meta: &lt;10%
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Últimos 30 dias</p>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>
        </section>
      )}

      {/* Gráfico de Tendência Semanal e Receita por Fisioterapeuta */}
      <section aria-label="Gráficos e desempenho">
        <div className="grid gap-4 md:gap-5 md:grid-cols-2">
          {/* Tendência Semanal */}
          <AnimatedCard delay={400}>
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3 px-4 pt-4">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  Tendência Semanal
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <LazyWidget height={200}>
                  {!metrics?.tendenciaSemanal || metrics.tendenciaSemanal.length === 0 ? (
                    <EmptyState
                      icon={TrendingUp}
                      title="Sem dados semanais"
                      description="Os dados de tendência aparecerão aqui após os primeiros agendamentos da semana."
                      className="py-6"
                    />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={metrics.tendenciaSemanal} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <XAxis
                          dataKey="dia"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
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
                </LazyWidget>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Desempenho por Profissional */}
          <AnimatedCard delay={450}>
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3 px-4 pt-4">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <div className="p-1.5 bg-success/10 rounded-lg">
                    <UserCheck className="h-4 w-4 text-success" />
                  </div>
                  Ranking de Desempenho
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <LazyWidget height={200}>
                  {(metrics?.receitaPorFisioterapeuta?.length || 0) === 0 ? (
                    <EmptyState
                      icon={UserCheck}
                      title="Nenhum atendimento"
                      description="Os dados de desempenho aparecerão após os primeiros atendimentos do mês."
                      actionLabel="Agendar Agora"
                      onAction={() => navigate('/agenda')}
                      className="py-6"
                    />
                  ) : (
                    <div className="space-y-4">
                      {metrics?.receitaPorFisioterapeuta.map((fisio, index) => (
                        <div key={fisio.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${index === 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                #{index + 1}
                              </span>
                              <span className="text-xs font-medium">{fisio.nome}</span>
                            </div>
                            <span className="text-xs font-bold text-success">
                              R$ {fisio.receita.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={(fisio.atendimentos / maxAtendimentos) * 100}
                              className="h-1.5 flex-1"
                            />
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {fisio.atendimentos} atend.
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </LazyWidget>
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
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3 px-4 pt-4">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  Próximos da Agenda
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {appointmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                  </div>
                ) : agendamentosProximos.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="Agenda livre"
                    description="Não há agendamentos próximos registrados no momento."
                    actionLabel="Abrir Agenda"
                    onAction={() => navigate('/agenda')}
                    className="py-10"
                  />
                ) : (
                  <div className="space-y-2">
                    {agendamentosProximos.map((agendamento) => (
                      <div
                        key={agendamento.id}
                        className="flex items-center justify-between p-3 border border-border/50 rounded-xl hover:bg-accent/50 transition-all cursor-pointer group"
                        onClick={() => navigate('/agenda')}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                            {agendamento.horario}
                          </div>
                          <p className="text-sm font-semibold truncate max-w-[150px]">
                            {agendamento.paciente}
                          </p>
                        </div>
                        <Badge variant={statusBadgeVariant(agendamento.status)} className="text-[10px] uppercase">
                          {agendamento.status}
                        </Badge>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      className="w-full mt-2 text-xs text-muted-foreground hover:text-primary"
                      onClick={() => navigate('/agenda')}
                    >
                      Ver agenda completa
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Ações Rápidas */}
          <AnimatedCard delay={700} className="lg:col-span-3">
            <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3 px-4 pt-4">
                <CardTitle className="text-base font-medium">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <Button
                  className="w-full justify-start bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-sm h-11 rounded-xl"
                  onClick={() => navigate('/pacientes')}
                >
                  <Users className="mr-3 h-5 w-5" />
                  Cadastrar Paciente
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button className="justify-start text-xs h-10 rounded-xl" variant="outline" onClick={() => navigate('/agenda')}>
                    <Calendar className="mr-2 h-4 w-4 text-primary" />
                    Agendar
                  </Button>
                  <Button className="justify-start text-xs h-10 rounded-xl" variant="outline" onClick={() => navigate('/eventos')}>
                    <CalendarDays className="mr-2 h-4 w-4 text-accent" />
                    Eventos
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button className="justify-start text-xs h-10 rounded-xl" variant="outline" onClick={() => navigate('/relatorios')}>
                    <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                    Relatórios
                  </Button>
                  <Button className="justify-start text-xs h-10 rounded-xl" variant="outline" onClick={() => navigate('/financeiro')}>
                    <DollarSign className="mr-2 h-4 w-4 text-success" />
                    Financeiro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </section>

      {/* Alertas e Notificações (Inteligentes) */}
      <section aria-label="Alertas e notificações">
        <AnimatedCard delay={750}>
          <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <AlertCircle className="h-5 w-5 text-warning" />
                Alertas do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-3">
                {(metrics?.pacientesEmRisco || 0) > 0 && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-warning/5 border border-warning/10 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-warning shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{metrics?.pacientesEmRisco} pacientes em risco</p>
                      <p className="text-xs text-muted-foreground">Sem consulta registrada há mais de 30 dias.</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/pacientes')}
                      className="w-full sm:w-auto h-8 text-xs rounded-lg"
                    >
                      Gerenciar
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-3 p-4 bg-success/5 border border-success/10 rounded-xl">
                  <Activity className="h-5 w-5 text-success" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Integridade do Sistema</p>
                    <p className="text-xs text-muted-foreground">Sincronização em tempo real ativa.</p>
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

// Custom comparison for AdminDashboard memoization
function adminDashboardAreEqual(prev: AdminDashboardProps, next: AdminDashboardProps) {
  // Only re-render if period changes
  return prev.period === next.period;
}

export default memo(AdminDashboard, adminDashboardAreEqual);
AdminDashboard.displayName = 'AdminDashboard';
