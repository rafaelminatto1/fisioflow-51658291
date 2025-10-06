import { useState, useEffect, useCallback } from 'react';
import { StatCard } from './StatCard';
import { AppointmentWidget } from './AppointmentWidget';
import { ChartWidget } from './ChartWidget';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Profile } from '@/types/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Activity, 
  TrendingUp,
  FileText,
  MessageSquare,
  Download,
  Play,
  CheckCircle,
  Target
} from 'lucide-react';
import { format } from 'date-fns';

interface PatientDashboardProps {
  lastUpdate: Date;
  profile: Profile;
}

export function PatientDashboard({ lastUpdate, profile }: PatientDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    nextAppointments: 0,
    todayExercises: 0,
    treatmentProgress: 0,
    completedSessions: 0
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [todayExercises, setTodayExercises] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Find the patient record for this user
      const { data: patientRecord, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      if (patientError && patientError.code !== 'PGRST116') {
        throw patientError;
      }

      let patientId = patientRecord?.id;

      // If no patient record exists, create one
      if (!patientRecord) {
        const { data: newPatient, error: createError } = await supabase
          .from('patients')
          .insert({
            name: profile.full_name,
            email: profile.user_id, // Using user_id as email reference
            profile_id: profile.id,
            birth_date: profile.birth_date || '1990-01-01',
            gender: 'Não informado',
            main_condition: 'Em avaliação',
            status: 'Inicial'
          })
          .select()
          .single();

        if (createError) throw createError;
        patientId = newPatient.id;
      }

      // Load upcoming appointments
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .gte('appointment_date', today)
        .order('appointment_date')
        .order('appointment_time')
        .limit(5);

      if (appointmentsError) throw appointmentsError;

      // Load exercise plans
      const { data: exercisePlans, error: exerciseError } = await supabase
        .from('exercise_plans')
        .select(`
          *,
          exercise_plan_items (
            *,
            exercises (*)
          )
        `)
        .eq('patient_id', patientId)
        .eq('status', 'Ativo');

      if (exerciseError) throw exerciseError;

      // Load patient progress
      const { data: progressRecords, error: progressError } = await supabase
        .from('patient_progress')
        .select('*')
        .eq('patient_id', patientId)
        .order('progress_date', { ascending: false })
        .limit(7);

      if (progressError) throw progressError;

      // Generate progress chart data
      const progressChartData = progressRecords?.map(record => ({
        name: format(new Date(record.progress_date), 'dd/MM'),
        value: record.functional_score || 0
      })).reverse() || [];

      // If no progress data, generate mock data
      if (progressChartData.length === 0) {
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          progressChartData.push({
            name: format(date, 'dd/MM'),
            value: Math.floor(Math.random() * 20) + 60 + i * 3 // Progressive improvement
          });
        }
      }

      // Calculate today's exercises
      const allExercises = exercisePlans?.flatMap(plan => 
        plan.exercise_plan_items?.map(item => ({
          id: item.id,
          name: item.exercises?.name || 'Exercício',
          sets: item.sets,
          reps: item.repetitions, // Corrigido de 'reps' para 'repetitions'
          completed: Math.random() > 0.5 // Mock completion status
        }))
      ) || [];

      setStats({
        nextAppointments: appointments?.length || 0,
        todayExercises: allExercises.length,
        treatmentProgress: Math.floor(Math.random() * 40) + 40, // Removido patientRecord?.progress (campo não existe)
        completedSessions: Math.floor(Math.random() * 10) + 5 // Mock data
      });

      setUpcomingAppointments(appointments?.map(apt => ({
        id: apt.id,
        patient_name: profile.full_name || 'Você',
        appointment_time: apt.appointment_time,
        appointment_date: apt.appointment_date,
        status: apt.status,
        type: apt.type,
        room: apt.room
      })) || []);

      setTodayExercises(allExercises.slice(0, 5));
      setProgressData(progressChartData);

      // Mock messages and documents
      setMessages([
        { id: '1', title: 'Lembrete: Consulta amanhã', date: 'Hoje', read: false },
        { id: '2', title: 'Novo plano de exercícios disponível', date: 'Ontem', read: true },
        { id: '3', title: 'Resultado dos exames', date: '2 dias atrás', read: true }
      ]);

      setDocuments([
        { id: '1', name: 'Plano de Tratamento.pdf', type: 'Plano', date: '15/03/2024' },
        { id: '2', name: 'Exames Laboratoriais.pdf', type: 'Exame', date: '10/03/2024' },
        { id: '3', name: 'Relatório de Evolução.pdf', type: 'Relatório', date: '05/03/2024' }
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
  }, [profile.id, profile.full_name, profile.user_id, profile.birth_date]);

  useEffect(() => {
    loadDashboardData();

    // Set up real-time subscriptions
    const appointmentsSubscription = supabase
      .channel('patient-appointments')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsSubscription);
    };
  }, [lastUpdate, loadDashboardData]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-primary rounded-xl p-6 text-primary-foreground shadow-medical">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Olá, {profile.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-primary-foreground/90">
              Acompanhe seu tratamento e evolução
            </p>
          </div>
          <div className="hidden md:block">
            <Activity className="w-16 h-16 text-primary-foreground/80" />
          </div>
        </div>
      </div>

      {/* Patient Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Próximas Consultas"
          value={stats.nextAppointments}
          change={stats.nextAppointments > 0 ? 'Agendadas' : 'Nenhuma agendada'}
          changeType={stats.nextAppointments > 0 ? 'positive' : 'neutral'}
          icon={<Calendar className="w-5 h-5 text-primary" />}
          gradient
          loading={loading}
        />
        <StatCard
          title="Exercícios Hoje"
          value={stats.todayExercises}
          change={`${todayExercises.filter(e => e.completed).length} concluídos`}
          changeType="positive"
          icon={<Activity className="w-5 h-5 text-secondary" />}
          loading={loading}
        />
        <StatCard
          title="Progresso do Tratamento"
          value={`${stats.treatmentProgress}%`}
          change="Em evolução"
          changeType="positive"
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          loading={loading}
        />
        <StatCard
          title="Sessões Realizadas"
          value={stats.completedSessions}
          change="Total"
          changeType="positive"
          icon={<CheckCircle className="w-5 h-5 text-blue-600" />}
          loading={loading}
        />
      </div>

      {/* Progress Chart and Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartWidget
            title="Sua Evolução no Tratamento"
            data={progressData}
            type="line"
            loading={loading}
            height={300}
          />
        </div>
        
        <AppointmentWidget
          title="Próximas Consultas"
          appointments={upcomingAppointments}
          loading={loading}
          showActions={false}
        />
      </div>

      {/* Today's Exercises and Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Exercises */}
        <Card className="bg-gradient-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Exercícios de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))
            ) : todayExercises.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum exercício para hoje</p>
              </div>
            ) : (
              todayExercises.map((exercise) => (
                <div key={exercise.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{exercise.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {exercise.sets} séries x {exercise.reps} repetições
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {exercise.completed ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        Concluído
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="h-8">
                        <Play className="w-3 h-3 mr-1" />
                        Iniciar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
            
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progresso Diário</span>
                <span className="text-sm font-medium">
                  {todayExercises.filter(e => e.completed).length}/{todayExercises.length}
                </span>
              </div>
              <Progress 
                value={(todayExercises.filter(e => e.completed).length / Math.max(todayExercises.length, 1)) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Messages and Documents */}
        <div className="space-y-6">
          {/* Messages */}
          <Card className="bg-gradient-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-secondary" />
                Mensagens da Clínica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.slice(0, 3).map((message) => (
                <div key={message.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-foreground">{message.title}</h4>
                    <p className="text-xs text-muted-foreground">{message.date}</p>
                  </div>
                  {!message.read && (
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="bg-gradient-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Documentos Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.slice(0, 3).map((document) => (
                <div key={document.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-foreground">{document.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{document.type}</Badge>
                      <span className="text-xs text-muted-foreground">{document.date}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-8">
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}