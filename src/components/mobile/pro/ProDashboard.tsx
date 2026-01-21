/**
 * ProDashboard - Dashboard principal para profissionais no iOS
 * Exibe visão geral do dia, próximos pacientes e estatísticas rápidas
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  ChevronRight,
  Bell,
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Input } from '@/components/shared/ui/input';
import { useProApp } from '../pro/ProApp';
import { useHealthKit } from '@/lib/mobile/healthkit';

interface Appointment {
  id: string;
  start_time: string;
  patient?: {
    name: string;
  };
  status: string;
}

interface PatientStats {
  totalPatients: number;
  todayAppointments: number;
  completedSessions: number;
  pendingTasks: number;
}

/**
 * ProDashboard - Dashboard do profissional
 */
export function ProDashboard() {
  const navigate = useNavigate();
  const { user } = useProApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<PatientStats>({
    totalPatients: 0,
    todayAppointments: 0,
    completedSessions: 0,
    pendingTasks: 0
  });
  const [loading, setLoading] = useState(true);

  // HealthKit integration
  const { getTodayHealthSummary } = useHealthKit();
  const [healthData, setHealthData] = useState({
    steps: 0,
    calories: 0
  });

  useEffect(() => {
    loadData();
    loadHealthData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar agendamentos de hoje
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*, patient:patients(name)')
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      setAppointments(appointmentsData || []);

      // Carregar estatísticas
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString());

      const { count: completedSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', startOfDay.toISOString());

      setStats({
        totalPatients: totalPatients || 0,
        todayAppointments: todayAppointments || 0,
        completedSessions: completedSessions || 0,
        pendingTasks: 0 // TODO: Calcular tarefas pendentes
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHealthData = async () => {
    try {
      const summary = await getTodayHealthSummary();
      setHealthData({
        steps: summary.steps,
        calories: summary.calories
      });
    } catch (error) {
      console.error('Erro ao carregar dados de saúde:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'completed':
        return 'Realizado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Pendente';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header com saudação e busca */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Olá, {user?.user_metadata?.name || 'Profissional'}</h1>
          <p className="text-muted-foreground text-sm">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-5 w-5" />
            {stats.pendingTasks > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Button>
        </div>
      </div>

      {/* Busca rápida */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar pacientes, exercícios..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4" onClick={() => navigate('/patients')}>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Pacientes</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalPatients}</p>
        </Card>

        <Card className="p-4" onClick={() => navigate('/schedule')}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Hoje</span>
          </div>
          <p className="text-2xl font-bold">{stats.todayAppointments}</p>
        </Card>

        <Card className="p-4" onClick={() => navigate('/sessions')}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Sessões</span>
          </div>
          <p className="text-2xl font-bold">{stats.completedSessions}</p>
        </Card>

        {/* HealthKit - Passos do dia */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Passos</span>
          </div>
          <p className="text-2xl font-bold">{healthData.steps.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {healthData.calories.toLocaleString()} kcal
          </p>
        </Card>
      </div>

      {/* Próximos Agendamentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Próximos Agendamentos</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/schedule')}
          >
            Ver todos
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum agendamento para hoje</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  onClick={() => navigate(`/appointments/${appointment.id}`)}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {appointment.patient?.name || 'Paciente'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(appointment.start_time), 'HH:mm')}
                    </p>
                  </div>
                  <Badge
                    className={getStatusColor(appointment.status)}
                  >
                    {getStatusLabel(appointment.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/patients/new')}
            >
              <Users className="h-4 w-4 mr-2" />
              Novo Paciente
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/schedule/new')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Agendar
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/exercises')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Exercícios
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/reports')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Relatórios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
