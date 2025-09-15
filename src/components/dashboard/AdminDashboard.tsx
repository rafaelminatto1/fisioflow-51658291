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
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPacientes}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.pacientesNovos} novos este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.agendamentosHoje}</div>
            <p className="text-xs text-muted-foreground">
              {stats.agendamentosRestantes} restantes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.receitaMensal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fisioterapeutas Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fisioterapeutasAtivos}</div>
            <p className="text-xs text-muted-foreground">
              Todos disponíveis hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Agendamentos e Ações Rápidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Agendamentos Próximos */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Próximos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agendamentosProximos.map((agendamento) => (
                <div key={agendamento.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium">{agendamento.horario}</div>
                    <div>
                      <p className="text-sm font-medium">{agendamento.paciente}</p>
                      <p className="text-xs text-muted-foreground">{agendamento.fisioterapeuta}</p>
                    </div>
                  </div>
                  <Badge variant={statusBadgeVariant(agendamento.status)}>
                    {agendamento.status}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                Ver Todos os Agendamentos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Novo Paciente
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Agendar Consulta
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Activity className="mr-2 h-4 w-4" />
              Registrar Evolução
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Relatórios
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
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
