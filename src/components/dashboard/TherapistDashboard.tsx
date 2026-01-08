import { useState, useEffect, useCallback, useMemo } from 'react';
import { StatCard } from './StatCard';
import { AppointmentWidget } from './AppointmentWidget';
import { ChartWidget } from './ChartWidget';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Profile } from '@/types/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  Activity,
  Star,
  CheckCircle,
  Target,
  Brain,
  MessageSquare
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppointments } from '@/hooks/useAppointments';

interface TherapistDashboardProps {
  lastUpdate: Date;
  profile: Profile;
}

export function TherapistDashboard({ lastUpdate, profile }: TherapistDashboardProps) {
  const [loading, setLoading] = useState(true);
  const { data: allAppointments = [], isLoading: appointmentsLoading } = useAppointments();

  const [stats, setStats] = useState({
    todayAppointments: 0,
    myPatients: 0,
    completedSessions: 0,
    avgSatisfaction: 0
  });
  const [myPatients, setMyPatients] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Calculate today's appointments for this therapist derived from hook data
  const todayAppointments = useMemo(() => {
    if (!profile?.id) return [];
    const today = new Date();

    return allAppointments
      .filter(apt => {
        // Filter by date (today)
        const isToday = isSameDay(apt.date, today);
        // Filter by therapist
        const isMyAppointment = apt.therapistId === profile.id;
        return isToday && isMyAppointment;
      })
      .map(apt => ({
        id: apt.id,
        patient_name: apt.patientName,
        appointment_time: apt.time,
        appointment_date: format(apt.date, 'yyyy-MM-dd'),
        status: apt.status,
        type: apt.type,
        room: '', // Not in base type yet, could be added if needed
        patient_phone: apt.phone
      }));
  }, [allAppointments, profile.id]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Load patients assigned to this therapist
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id, name, status, phone, email, created_at')
        .limit(5)
        .order('created_at', { ascending: false });

      if (patientsError) throw patientsError;

      // Load treatment sessions for progress tracking
      const { data: sessions, error: sessionsError } = await supabase
        .from('treatment_sessions')
        .select('*')
        .eq('created_by', profile.id);

      if (sessionsError) throw sessionsError;

      // Generate progress data for the last 30 days
      const progressChartData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i * 5);
        const dayName = format(date, 'dd/MM');
        const progress = Math.floor(Math.random() * 20) + 70; // Mock progress data
        progressChartData.push({
          name: dayName,
          value: progress
        });
      }

      setStats({
        todayAppointments: todayAppointments.length,
        myPatients: patients?.length || 0,
        completedSessions: sessions?.length || 0,
        avgSatisfaction: 4.8 // Mock data
      });

      setMyPatients(patients || []);
      setProgressData(progressChartData);

      // Mock tasks
      setTasks([
        { id: '1', title: 'Revisar plano de exercícios - João Silva', priority: 'high', due: 'Hoje' },
        { id: '2', title: 'Acompanhar evolução - Maria Santos', priority: 'medium', due: 'Amanhã' },
        { id: '3', title: 'Preparar relatório mensal', priority: 'low', due: 'Esta semana' }
      ]);

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
  }, [profile.id, todayAppointments.length]);

  // Update stats when appointments change
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      todayAppointments: todayAppointments.length
    }));
  }, [todayAppointments.length]);

  useEffect(() => {
    loadDashboardData();
    // Removed duplicate realtime subscription for appointments here
    // keeping it for other entities if needed, but appointments are handled by hook
  }, [lastUpdate, loadDashboardData]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const isLoading = loading || appointmentsLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-primary rounded-xl p-6 text-primary-foreground shadow-medical">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Olá, Dr(a). {profile.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-primary-foreground/90">
              Aqui está o resumo do seu dia e evolução dos seus pacientes
            </p>
          </div>
          <div className="hidden md:block">
            <Activity className="w-16 h-16 text-primary-foreground/80" />
          </div>
        </div>
      </div>

      {/* Personal Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          title="Consultas Hoje"
          value={stats.todayAppointments}
          change={stats.todayAppointments > 0 ? 'Agenda ativa' : 'Sem consultas'}
          changeType={stats.todayAppointments > 0 ? 'positive' : 'neutral'}
          icon={<Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />}
          gradient
          loading={isLoading}
        />
        <StatCard
          title="Meus Pacientes"
          value={stats.myPatients}
          change="Em acompanhamento"
          changeType="positive"
          icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />}
          loading={isLoading}
        />
        <StatCard
          title="Sessões Realizadas"
          value={stats.completedSessions}
          change="Este mês"
          changeType="positive"
          icon={<CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />}
          loading={isLoading}
        />
        <StatCard
          title="Satisfação Média"
          value={`${stats.avgSatisfaction}⭐`}
          change="Avaliação dos pacientes"
          changeType="positive"
          icon={<Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />}
          loading={isLoading}
        />
      </div>

      {/* Today's Schedule and Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AppointmentWidget
          title="Agenda de Hoje"
          appointments={todayAppointments}
          loading={isLoading}
          showActions={false}
        />

        <div className="lg:col-span-2">
          <ChartWidget
            title="Evolução dos Pacientes em Tratamento"
            data={progressData}
            type="line"
            loading={isLoading}
            height={300}
          />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Progress */}
        <Card className="bg-gradient-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Pacientes em Destaque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : myPatients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum paciente encontrado</p>
              </div>
            ) : (
              myPatients.slice(0, 4).map((patient) => (
                <div key={patient.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {patient.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'PA'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{patient.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {patient.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {patient.main_condition}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      {Math.floor(Math.random() * 40) + 40}%
                    </div>
                    <div className="text-xs text-muted-foreground">Progresso</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Tasks and Reminders */}
        <Card className="bg-gradient-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-secondary" />
              Tarefas e Lembretes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getPriorityColor(task.priority)}`}
                    >
                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{task.due}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-8">
                  <CheckCircle className="w-3 h-3" />
                </Button>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button variant="outline" size="sm" className="h-8">
                <Brain className="w-3 h-3 mr-1" />
                Planos IA
              </Button>
              <Button variant="outline" size="sm" className="h-8">
                <MessageSquare className="w-3 h-3 mr-1" />
                Mensagens
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}