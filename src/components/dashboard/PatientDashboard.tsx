// Dashboard de Paciente (Refatorado para usar RealtimeContext)
// Agora usa dados centralizados do contexto, eliminando subscrições duplicadas

import { useState, useMemo, useCallback } from 'react';
import { StatCard } from './StatCard';
import { ChartWidget } from './ChartWidget';
import { toast } from '@/hooks/use-toast';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Profile } from '@/types/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Activity,
  MessageSquare,
  Download,
  Play,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface PatientDashboardProps {
  _lastUpdate: Date;
  profile: Profile;
}

export function PatientDashboard({ _lastUpdate, profile }: PatientDashboardProps) {
  // Usar contexto Realtime central para obter dados
  const { appointments, metrics } = useRealtime();

  // Estado local para dados específicos (opcional)
  const [upcomingAppointments, setUpcomingAppointments] = useState(5);
  const [todayExercises, setTodayExercises] = useState(5);
  const [progressData, setProgressData] = useState<Array<{date: string, value: number}>>([]);
  const [messages, setMessages] = useState<Array<{type: 'success' | 'error', text: string}>>([]);

  /**
   * Carregar dados específicos do paciente
   * Usa os dados do contexto Realtime como base
   */
  const loadDashboardData = useCallback(async () => {
    try {
      // Próximos agendamentos (limitados a 5 do contexto)
      const sortedAppointments = [...appointments]
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
        .slice(0, 5);
      
      // Exercícios de hoje
      const todayExercisesData = Array.from({ length: 5 }, (_, i) => ({
        date: format(new Date(), 'dd/MM'),
        value: Math.floor(Math.random() * 30) + (i * 5),
      }));
      
      // Progresso do tratamento
      const progressChartData = Array.from({ length: 7 }, (_, i) => ({
        date: format(new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000), 'dd/MM'),
        value: Math.floor(Math.random() * 30) + (i * 5),
      }));

      setUpcomingAppointments(sortedAppointments);
      setTodayExercises(todayExercisesData);
      setProgressData(progressChartData);
      
      // Mensagens de notificação
      if (metrics.totalAppointments > 0 && upcomingAppointments.length > 0) {
        setMessages([
          {
            type: 'success',
            text: `${metrics.totalAppointments} agendamentos encontrados`
          }
        ]);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os dados do paciente'
      });
    }
  }, [appointments, metrics, profile]);

  const stats = useMemo(() => ({
    nextAppointments: Math.min(upcomingAppointments, 5),
    todayExercises,
    treatmentProgress: progressData.length > 0
      ? Math.round(progressData.reduce((sum, p) => sum + p.value, 0) / progressData.length)
      : 0,
    totalMessages: messages.length,
  }), [upcomingAppointments, todayExercises, progressData, messages]);

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Próximas Consultas"
          value={stats.nextAppointments}
          change={stats.nextAppointments > 0 ? 'positive' : 'neutral'}
          icon={<Calendar className="w-5 h-5 text-primary" />}
          gradient="from-blue-500 to-blue-600"
          loading={false}
        />
        
        <StatCard
          title="Exercícios Hoje"
          value={stats.todayExercises}
          change={`${stats.todayExercises > 0 ? 'completed' : 'neutral'}`}
          icon={<Activity className="w-5 h-5 text-secondary" />}
          gradient="from-green-500 to-green-600"
          loading={false}
        />
        
        <StatCard
          title="Progresso do Tratamento"
          value={`${stats.treatmentProgress}%`}
          change={stats.treatmentProgress >= 80 ? 'positive' : stats.treatmentProgress >= 50 ? 'neutral' : 'negative'}
          icon={<TrendingUp className="w-5 h-5 text-orange-500" />}
          gradient={stats.treatmentProgress >= 80 ? 'from-orange-500 to-orange-600' : 'from-yellow-500 to-yellow-600'}
          loading={false}
        />
        
        <StatCard
          title="Mensagens"
          value={stats.totalMessages}
          change="neutral"
          icon={<MessageSquare className="w-5 h-5 text-blue-500" />}
          gradient="from-purple-500 to-purple-600"
          loading={false}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-6">
        <Button
          onClick={loadDashboardData}
          variant="default"
        >
          <Download className="mr-2 h-4 w-4" />
          Atualizar Dados
        </Button>
        
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
        >
          <Play className="mr-2 h-4 w-4" />
          Recarregar
        </Button>
      </div>

      {/* Progress Section */}
      {messages.length > 0 && (
        <div className="mt-6 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                msg.type === 'success' 
                  ? 'bg-green-500/10 border-green-500' 
                  : 'bg-red-500/10 border-red-500'
              }`}
            >
              <div className="flex items-start gap-3">
                {msg.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-red-600 flex-shrink-0" />
                )}
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress Section */}
      {progressData.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução do Progresso</CardTitle>
              <CardDescription>Histórico do progresso do tratamento</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartWidget
                data={progressData}
                height={200}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
