/**
 * PatientApp - App móvel para pacientes
 * Versão melhorada com componentes mobile compartilhados
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { MobileLayout } from '@/components/mobile/shared/MobileTabBar';
import { SafeScreen } from '@/components/mobile/shared/SafeAreaWrapper';
import { initPushNotifications } from '@/lib/mobile/push-notifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MessageSquare, Activity, User, TrendingUp } from 'lucide-react';

// Define interface for appointment data
interface Appointment {
  id: string;
  start_time: string;
  status: string;
  therapists?: { name: string } | null;
}

interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  completed?: boolean;
}

/**
 * PatientApp - Componente principal do app paciente
 */
export function PatientApp() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    completedToday: 0,
    totalExercises: 0,
    adherenceRate: 0
  });

  useEffect(() => {
    // Inicializar features nativas
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: 'dark' });
      initPushNotifications();
    }

    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    try {
      setLoading(true);

      // Buscar paciente pelo user_id
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', user?.id)
        .single();

      if (!patient) {
        setLoading(false);
        return;
      }

      // Carregar agendamentos futuros
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*, therapists:profiles(name)')
        .eq('patient_id', patient.id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      setAppointments(appointmentsData || []);

      // Carregar exercícios prescritos
      const { data: prescriptionsData } = await supabase
        .from('prescriptions')
        .select('*, prescription_items(*, exercises(*))')
        .eq('patient_id', patient.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (prescriptionsData && prescriptionsData.length > 0) {
        const items = prescriptionsData[0].prescription_items || [];
        const exerciseList = items.map((item: any) => ({
          id: item.id,
          name: item.exercises?.name || 'Exercício',
          sets: item.sets,
          reps: item.reps,
          completed: false
        }));

        setExercises(exerciseList);
        setStats({
          completedToday: 0,
          totalExercises: exerciseList.length,
          adherenceRate: 0
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
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
  }

  if (authLoading || loading) {
    return (
      <SafeScreen className="flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="ml-4 text-muted-foreground">Carregando...</p>
      </SafeScreen>
    );
  }

  return (
    <MobileLayout userRole="patient" showTabBar={true}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Olá, {user?.user_metadata?.name?.split(' ')[0] || 'Paciente'}!</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center" onClick={() => navigate('/mobile/patient/exercises')}>
            <Activity className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats.completedToday}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </Card>
          <Card className="p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{stats.totalExercises}</p>
            <p className="text-xs text-muted-foreground">Exercícios</p>
          </Card>
          <Card className="p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats.adherenceRate}%</p>
            <p className="text-xs text-muted-foreground">Adesão</p>
          </Card>
        </div>

        {/* Próxima Consulta */}
        {appointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Próxima Consulta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{appointments[0].therapists?.name || 'Fisioterapeuta'}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(appointments[0].start_time), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Badge className={getStatusColor(appointments[0].status)}>
                  {appointments[0].status === 'confirmed' ? 'Confirmada' : 'Pendente'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs do conteúdo principal */}
        <Tabs defaultValue="appointments" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appointments" className="flex flex-col items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Consultas</span>
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex flex-col items-center gap-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs">Exercícios</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex flex-col items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col items-center gap-1">
              <User className="h-4 w-4" />
              <span className="text-xs">Perfil</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Meus Agendamentos</CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum agendamento futuro</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                        onClick={() => navigate(`/mobile/patient/appointments/${apt.id}`)}
                      >
                        <div>
                          <p className="font-medium">{apt.therapists?.name || 'Fisioterapeuta'}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(apt.start_time), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge className={getStatusColor(apt.status)}>
                          {apt.status === 'confirmed' ? 'Confirmada' : 'Pendente'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exercises" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Meus Exercícios de Hoje</CardTitle>
                <CardDescription>Exercícios prescritos pelo seu fisioterapeuta</CardDescription>
              </CardHeader>
              <CardContent>
                {exercises.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum exercício para hoje</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                        onClick={() => navigate(`/mobile/patient/exercises/${exercise.id}`)}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{exercise.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {exercise.sets} séries × {exercise.reps} repetições
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {exercise.completed && (
                            <Badge className="bg-green-500">Concluído</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Chat com Fisioterapeuta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Funcionalidade em desenvolvimento</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate('/chat')}
                  >
                    Abrir Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Meu Perfil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                    <div>
                      <p className="font-medium">{user?.user_metadata?.name}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/mobile/patient/profile')}
                  >
                    Editar Perfil
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/mobile/patient/progress')}
                  >
                    Ver Progresso
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}

// Export padrão para compatibilidade
export default PatientApp;

