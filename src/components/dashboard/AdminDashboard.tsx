import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, DollarSign, Activity, Clock, UserCheck, AlertCircle, TrendingUp } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  // Mock data - em produção viria do backend
  const stats = {
    totalPacientes: 247,
    agendamentosHoje: 12,
    receitaMensal: 18500,
    fisioterapeutasAtivos: 8,
    agendamentosRestantes: 5,
    pacientesNovos: 15
  };

  const agendamentosProximos = [
    { id: 1, paciente: 'Ana Silva', horario: '09:00', fisioterapeuta: 'Dr. João', status: 'confirmado' },
    { id: 2, paciente: 'Carlos Oliveira', horario: '10:30', fisioterapeuta: 'Dra. Maria', status: 'pendente' },
    { id: 3, paciente: 'Luciana Santos', horario: '14:00', fisioterapeuta: 'Dr. Pedro', status: 'confirmado' },
    { id: 4, paciente: 'Roberto Lima', horario: '15:30', fisioterapeuta: 'Dra. Clara', status: 'confirmado' }
  ];

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
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">{stats.totalPacientes}</div>
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
            <div className="text-3xl font-bold text-foreground">{stats.agendamentosHoje}</div>
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
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">R$ {stats.receitaMensal.toLocaleString()}</div>
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
            <div className="text-3xl font-bold text-foreground">{stats.fisioterapeutasAtivos}</div>
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
              {agendamentosProximos.map((agendamento) => (
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
              ))}
            </div>
            <div className="mt-6">
              <Button variant="outline" className="w-full hover:bg-accent/80 border-border/50">
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
            <Button className="w-full justify-start bg-gradient-primary text-primary-foreground hover:bg-gradient-primary/90 shadow-sm">
              <Users className="mr-3 h-4 w-4" />
              Novo Paciente
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-3 h-4 w-4 text-primary" />
              Agendar Consulta
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Activity className="mr-3 h-4 w-4 text-secondary" />
              Registrar Evolução
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="mr-3 h-4 w-4 text-primary-glow" />
              Relatórios
            </Button>
            <Button className="w-full justify-start" variant="outline">
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
              <Button size="sm" variant="outline">
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
