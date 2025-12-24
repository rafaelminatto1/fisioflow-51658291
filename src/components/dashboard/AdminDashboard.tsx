import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, Users, DollarSign, Clock, UserCheck, AlertCircle, 
  TrendingUp, TrendingDown, UserX, Activity, Receipt, Target,
  CalendarDays, XCircle
} from 'lucide-react';
import { EventosStatsWidget } from '@/components/eventos/EventosStatsWidget';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useQuery } from '@tanstack/react-query';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();

  // Próximos agendamentos
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
          patients!inner(name)
        `)
        .gte('appointment_date', today)
        .order('appointment_date')
        .order('appointment_time')
        .limit(4);

      return data?.map(apt => ({
        id: apt.id,
        paciente: (apt.patients as any)?.name || 'Paciente',
        horario: apt.appointment_time,
        status: apt.status
      })) || [];
    },
  });

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmado': return 'default';
      case 'pendente': case 'aguardando_confirmacao': return 'secondary';
      case 'cancelado': return 'destructive';
      case 'concluido': return 'outline';
      default: return 'default';
    }
  };

  const loading = metricsLoading || appointmentsLoading;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Estatísticas de Eventos */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Estatísticas de Eventos</h2>
        <EventosStatsWidget />
      </div>

      {/* Cards de Estatísticas Principais */}
      {loading ? (
        <LoadingSkeleton type="stats" rows={4} />
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-card border-border/50 hover:shadow-hover transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Total de Pacientes
              </CardTitle>
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {metrics?.totalPacientes || 0}
              </div>
              <p className="text-xs sm:text-sm text-success font-medium mt-1">
                +{metrics?.pacientesNovos || 0} novos este mês
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 hover:shadow-hover transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Agendamentos Hoje
              </CardTitle>
              <div className="p-1.5 sm:p-2 bg-secondary/50 rounded-lg group-hover:bg-secondary/70 transition-colors">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-foreground">
                {metrics?.agendamentosHoje || 0}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {metrics?.agendamentosRestantes || 0} restantes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 hover:shadow-hover transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Receita Mensal
              </CardTitle>
              <div className="p-1.5 sm:p-2 bg-success/10 rounded-lg group-hover:bg-success/20 transition-colors">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-3xl font-bold text-success">
                R$ {(metrics?.receitaMensal || 0).toLocaleString('pt-BR')}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {(metrics?.crescimentoMensal || 0) >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
                    <span className="text-xs sm:text-sm text-success font-medium">
                      +{metrics?.crescimentoMensal || 0}%
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                    <span className="text-xs sm:text-sm text-destructive font-medium">
                      {metrics?.crescimentoMensal || 0}%
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 hover:shadow-hover transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Ticket Médio
              </CardTitle>
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-3xl font-bold text-foreground">
                R$ {(metrics?.ticketMedio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                por atendimento
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Métricas Avançadas */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Taxa de No-Show</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{metrics?.taxaNoShow || 0}%</p>
              </div>
              <div className={`p-2 sm:p-3 rounded-full ${(metrics?.taxaNoShow || 0) > 10 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                <UserX className={`h-4 w-4 sm:h-5 sm:w-5 ${(metrics?.taxaNoShow || 0) > 10 ? 'text-destructive' : 'text-success'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Pacientes Ativos</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{metrics?.pacientesAtivos || 0}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-full bg-primary/10">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Semana</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{metrics?.agendamentosSemana || 0}</p>
                <p className="text-xs text-muted-foreground">agendamentos</p>
              </div>
              <div className="p-2 sm:p-3 rounded-full bg-accent/10">
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Cancelamentos</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{metrics?.cancelamentosSemana || 0}</p>
                <p className="text-xs text-muted-foreground">esta semana</p>
              </div>
              <div className={`p-2 sm:p-3 rounded-full ${(metrics?.cancelamentosSemana || 0) > 3 ? 'bg-warning/10' : 'bg-muted'}`}>
                <XCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${(metrics?.cancelamentosSemana || 0) > 3 ? 'text-warning' : 'text-muted-foreground'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Tendência Semanal e Receita por Fisioterapeuta */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tendência Semanal */}
        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              Tendência Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <LoadingSkeleton type="card" rows={1} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={metrics?.tendenciaSemanal || []}>
                  <XAxis 
                    dataKey="dia" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="agendamentos" name="Agendamentos" radius={[4, 4, 0, 0]}>
                    {(metrics?.tendenciaSemanal || []).map((_, index) => (
                      <Cell key={index} fill="hsl(var(--primary))" opacity={0.6} />
                    ))}
                  </Bar>
                  <Bar dataKey="concluidos" name="Concluídos" radius={[4, 4, 0, 0]}>
                    {(metrics?.tendenciaSemanal || []).map((_, index) => (
                      <Cell key={index} fill="hsl(var(--success))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Receita por Fisioterapeuta */}
        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
              <div className="p-2 bg-success/10 rounded-lg">
                <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              Desempenho por Profissional
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <LoadingSkeleton type="list" rows={3} />
            ) : (metrics?.receitaPorFisioterapeuta?.length || 0) === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum atendimento registrado este mês</p>
              </div>
            ) : (
              <div className="space-y-4">
                {metrics?.receitaPorFisioterapeuta.map((fisio, index) => (
                  <div key={fisio.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${index === 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
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
                        value={(fisio.atendimentos / Math.max(...(metrics?.receitaPorFisioterapeuta.map(f => f.atendimentos) || [1]))) * 100} 
                        className="h-2 flex-1"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {fisio.atendimentos} atend.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Ocupação e Risco */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Taxa de Ocupação</p>
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold">{metrics?.taxaOcupacao || 0}%</span>
                <span className="text-xs text-muted-foreground">da capacidade</span>
              </div>
              <Progress value={metrics?.taxaOcupacao || 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Média Sessões/Paciente</p>
              <Calendar className="h-5 w-5 text-accent" />
            </div>
            <div className="space-y-2">
              <span className="text-3xl font-bold">{metrics?.mediaSessoesPorPaciente || 0}</span>
              <p className="text-xs text-muted-foreground">nos últimos 30 dias</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Pacientes em Risco</p>
              <AlertCircle className={`h-5 w-5 ${(metrics?.pacientesEmRisco || 0) > 5 ? 'text-warning' : 'text-muted-foreground'}`} />
            </div>
            <div className="space-y-2">
              <span className={`text-3xl font-bold ${(metrics?.pacientesEmRisco || 0) > 5 ? 'text-warning' : ''}`}>
                {metrics?.pacientesEmRisco || 0}
              </span>
              <p className="text-xs text-muted-foreground">sem consulta há 30+ dias</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Agendamentos e Ações Rápidas */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Agendamentos Próximos */}
        <Card className="lg:col-span-4 bg-gradient-card border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              Próximos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <LoadingSkeleton type="list" rows={3} />
            ) : agendamentosProximos.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum agendamento próximo</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {agendamentosProximos.map((agendamento) => (
                  <div 
                    key={agendamento.id} 
                    className="flex items-center justify-between p-3 sm:p-4 border border-border/50 rounded-xl hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="text-xs sm:text-sm font-bold text-primary bg-primary/10 px-2 sm:px-3 py-1 rounded-lg">
                        {agendamento.horario}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[100px] sm:max-w-none">
                          {agendamento.paciente}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusBadgeVariant(agendamento.status)} className="text-xs">
                      {agendamento.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 sm:mt-6">
              <Button 
                variant="outline" 
                className="w-full hover:bg-accent/80 border-border/50"
                onClick={() => navigate('/agenda')}
              >
                Ver Todos os Agendamentos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card className="lg:col-span-3 bg-gradient-card border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <Button 
              className="w-full justify-start bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-sm text-sm sm:text-base"
              onClick={() => navigate('/pacientes')}
            >
              <Users className="mr-2 sm:mr-3 h-4 w-4" />
              Novo Paciente
            </Button>
            <Button className="w-full justify-start text-sm sm:text-base" variant="outline" onClick={() => navigate('/agenda')}>
              <Calendar className="mr-2 sm:mr-3 h-4 w-4 text-primary" />
              Agendar Consulta
            </Button>
            <Button className="w-full justify-start text-sm sm:text-base" variant="outline" onClick={() => navigate('/eventos')}>
              <Calendar className="mr-2 sm:mr-3 h-4 w-4 text-accent" />
              Gerenciar Eventos
            </Button>
            <Button className="w-full justify-start text-sm sm:text-base" variant="outline" onClick={() => navigate('/relatorios')}>
              <TrendingUp className="mr-2 sm:mr-3 h-4 w-4 text-primary" />
              Relatórios
            </Button>
            <Button className="w-full justify-start text-sm sm:text-base" variant="outline" onClick={() => navigate('/financeiro')}>
              <DollarSign className="mr-2 sm:mr-3 h-4 w-4 text-success" />
              Financeiro
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alertas e Notificações */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Alertas e Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(metrics?.pacientesEmRisco || 0) > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{metrics?.pacientesEmRisco} pacientes sem consulta há mais de 30 dias</p>
                  <p className="text-xs text-muted-foreground">Considere entrar em contato para reativação</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/pacientes')}
                  className="w-full sm:w-auto"
                >
                  Ver Pacientes
                </Button>
              </div>
            )}
            {(metrics?.taxaNoShow || 0) > 10 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <UserX className="h-4 w-4 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Taxa de no-show acima do ideal ({metrics?.taxaNoShow}%)</p>
                  <p className="text-xs text-muted-foreground">Reforce os lembretes de confirmação</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/comunicacao')}
                  className="w-full sm:w-auto"
                >
                  Configurar
                </Button>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
              <Activity className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Sistema funcionando normalmente</p>
                <p className="text-xs text-muted-foreground">Última atualização: agora</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
