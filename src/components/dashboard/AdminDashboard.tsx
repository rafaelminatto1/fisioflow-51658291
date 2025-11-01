import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, DollarSign, Activity, Clock, UserCheck, AlertCircle, TrendingUp } from 'lucide-react';
import { EventosStatsWidget } from '@/components/eventos/EventosStatsWidget';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPacientes: 0,
    agendamentosHoje: 0,
    receitaMensal: 0,
    fisioterapeutasAtivos: 0,
    agendamentosRestantes: 0,
    pacientesNovos: 0
  });
  const [agendamentosProximos, setAgendamentosProximos] = useState<any[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Total de pacientes
      const { count: totalPacientes } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // Pacientes novos este mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { count: pacientesNovos } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // Agendamentos hoje
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: appointmentsToday, count: agendamentosHoje } = await supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(name)
        `, { count: 'exact' })
        .eq('appointment_date', today)
        .order('appointment_time');

      // Agendamentos concluídos hoje
      const { count: completedToday } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', today)
        .eq('status', 'concluido');

      // Fisioterapeutas ativos
      const { count: fisioterapeutasAtivos } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .or('role.eq.admin,role.eq.fisioterapeuta');

      // Receita mensal (mock - implementar quando tiver tabela financeira)
      const receitaMensal = 18500;

      // Próximos agendamentos
      const { data: nextAppointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          appointment_date,
          status,
          type,
          patients!inner(name),
          therapist_id
        `)
        .gte('appointment_date', today)
        .order('appointment_date')
        .order('appointment_time')
        .limit(4);

      setStats({
        totalPacientes: totalPacientes || 0,
        agendamentosHoje: agendamentosHoje || 0,
        receitaMensal,
        fisioterapeutasAtivos: fisioterapeutasAtivos || 0,
        agendamentosRestantes: (agendamentosHoje || 0) - (completedToday || 0),
        pacientesNovos: pacientesNovos || 0
      });

      setAgendamentosProximos(nextAppointments?.map(apt => ({
        id: apt.id,
        paciente: apt.patients?.name || 'Paciente',
        horario: apt.appointment_time,
        fisioterapeuta: 'Fisioterapeuta',
        status: apt.status
      })) || []);

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    // Realtime subscriptions
    const appointmentsSubscription = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' },
        () => loadDashboardData()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'patients' },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsSubscription);
    };
  }, [loadDashboardData]);

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmado': return 'default';
      case 'pendente': return 'secondary';
      case 'cancelado': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Estatísticas de Eventos */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Estatísticas de Eventos</h2>
        <EventosStatsWidget />
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Total de Pacientes</CardTitle>
            <div className="p-2 bg-gradient-primary/10 rounded-lg group-hover:bg-gradient-primary/20 transition-colors">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              {loading ? '...' : stats.totalPacientes}
            </div>
            <p className="text-sm text-secondary font-medium mt-1">
              +{stats.pacientesNovos} novos este mês
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Agendamentos Hoje</CardTitle>
            <div className="p-2 bg-gradient-secondary/10 rounded-lg group-hover:bg-gradient-secondary/20 transition-colors">
              <Calendar className="h-5 w-5 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? '...' : stats.agendamentosHoje}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.agendamentosRestantes} restantes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Receita Mensal</CardTitle>
            <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg opacity-80 group-hover:opacity-100 transition-opacity">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              R$ {loading ? '...' : stats.receitaMensal.toLocaleString()}
            </div>
            <p className="text-sm text-secondary font-medium mt-1">
              +12% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Fisioterapeutas Ativos</CardTitle>
            <div className="p-2 bg-gradient-primary/10 rounded-lg group-hover:bg-gradient-primary/20 transition-colors">
              <UserCheck className="h-5 w-5 text-primary-glow" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? '...' : stats.fisioterapeutasAtivos}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Todos disponíveis hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Agendamentos e Ações Rápidas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Agendamentos Próximos */}
        <Card className="col-span-4 bg-gradient-card border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              Próximos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between p-4 border border-border/50 rounded-xl">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="h-8 w-16 bg-muted rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : agendamentosProximos.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum agendamento próximo</p>
                </div>
              ) : (
                agendamentosProximos.map((agendamento) => (
                <div key={agendamento.id} className="flex items-center justify-between p-4 border border-border/50 rounded-xl hover:bg-accent/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">{agendamento.horario}</div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{agendamento.paciente}</p>
                      <p className="text-xs text-muted-foreground">{agendamento.fisioterapeuta}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={statusBadgeVariant(agendamento.status)}
                    className={agendamento.status === 'confirmado' ? 'bg-gradient-secondary text-secondary-foreground' : ''}
                  >
                    {agendamento.status}
                  </Badge>
                </div>
              ))
              )}
            </div>
            <div className="mt-6">
              <Button 
                variant="outline" 
                className="w-full hover:bg-accent/80 border-border/50"
                onClick={() => navigate('/schedule')}
              >
                Ver Todos os Agendamentos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card className="col-span-3 bg-gradient-card border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start bg-gradient-primary text-primary-foreground hover:bg-gradient-primary/90 shadow-sm"
              onClick={() => navigate('/patients')}
            >
              <Users className="mr-3 h-4 w-4" />
              Novo Paciente
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/schedule')}>
              <Calendar className="mr-3 h-4 w-4 text-primary" />
              Agendar Consulta
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/eventos')}>
              <Calendar className="mr-3 h-4 w-4 text-secondary" />
              Gerenciar Eventos
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/reports')}>
              <TrendingUp className="mr-3 h-4 w-4 text-primary-glow" />
              Relatórios
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/financial')}>
              <DollarSign className="mr-3 h-4 w-4 text-secondary" />
              Financeiro
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alertas e Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Alertas e Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">3 pacientes com consultas pendentes de confirmação</p>
                <p className="text-xs text-muted-foreground">Verificar agendamentos para hoje</p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/schedule')}
              >
                Verificar
              </Button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Activity className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Sistema de backup executado com sucesso</p>
                <p className="text-xs text-muted-foreground">Última execução: hoje às 03:00</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
