import { useMemo } from 'react';
import { ChartWidget } from './ChartWidget';
import { toast } from '@/hooks/use-toast';
import { Profile } from '@/types/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {

  Calendar,
  Activity,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Clock,
  Plus
} from 'lucide-react';
import { format, isSameDay, differenceInDays } from 'date-fns';
import { useAppointments } from '@/hooks/useAppointments';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface TherapistDashboardProps {
  lastUpdate: Date;
  profile: Profile;
}

export function TherapistDashboard({ lastUpdate, profile }: TherapistDashboardProps) {
  const { data: allAppointments = [], isLoading: appointmentsLoading } = useAppointments();

  // Calculate stats using useMemo for better performance
  const dashboardStats = useMemo(() => {
    if (!profile?.id || allAppointments.length === 0) {
      return {
        todayAppointments: [],
        stats: {
          todayAppointments: 0,
          myPatients: 0,
          completedSessions: 0,
          avgSatisfaction: 4.8,
          occupancyRate: 0,
          avgSessionsPerPatient: 0,
          patientsAtRisk: 0
        },
        progressData: []
      };
    }

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Filter today's appointments
    const todayApts = allAppointments
      .filter(apt => isSameDay(new Date(apt.date), today) && apt.therapistId === profile.id)
      .map(apt => ({
        id: apt.id,
        patient_name: apt.patientName,
        appointment_time: apt.time,
        appointment_date: format(new Date(apt.date), 'yyyy-MM-dd'),
        status: apt.status,
        type: apt.type,
        room: '',
        patient_phone: apt.phone
      }));

    // Stats calculations
    const totalCapacityMinutes = 480; // 8 hours
    const bookedMinutes = todayApts.length * 60;
    const occupancyRate = Math.round((bookedMinutes / totalCapacityMinutes) * 100);

    const uniquePatientsSet = new Set(
      allAppointments
        .filter(apt => new Date(apt.date) >= thirtyDaysAgo && apt.therapistId === profile.id)
        .map(apt => apt.patientId)
    );
    const myPatients = uniquePatientsSet.size;

    const completedSessions = allAppointments.filter(apt =>
      apt.status === 'concluido' && apt.therapistId === profile.id
    ).length;

    // Patients at risk
    const lastAppointmentsByPatient = new Map<string, Date>();
    allAppointments.forEach(apt => {
      if (apt.patientId && apt.therapistId === profile.id) {
        const existing = lastAppointmentsByPatient.get(apt.patientId);
        const aptDate = new Date(apt.date);
        if (!existing || aptDate > existing) {
          lastAppointmentsByPatient.set(apt.patientId, aptDate);
        }
      }
    });

    let patientsAtRisk = 0;
    lastAppointmentsByPatient.forEach(lastDate => {
      if (differenceInDays(new Date(), lastDate) > 30) {
        patientsAtRisk++;
      }
    });

    const recentAptsCount = allAppointments.filter(apt => 
      new Date(apt.date) >= thirtyDaysAgo && apt.therapistId === profile.id
    ).length;

    const avgSessionsPerPatient = myPatients > 0 
      ? parseFloat((recentAptsCount / myPatients).toFixed(1))
      : 0;

    // Mock progress data
    const progressChartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i * 5);
      progressChartData.push({
        name: format(date, 'dd/MM'),
        value: Math.floor(Math.random() * 20) + 70
      });
    }

    return {
      todayAppointments: todayApts,
      stats: {
        todayAppointments: todayApts.length,
        myPatients,
        completedSessions,
        avgSatisfaction: 4.8,
        occupancyRate,
        avgSessionsPerPatient,
        patientsAtRisk
      },
      progressData: progressChartData
    };
  }, [allAppointments, profile.id]);

  const { todayAppointments, stats, progressData } = dashboardStats;

  const getOccupancyLevel = (rate: number) => {
    if (rate < 30) return { label: 'Baixa ocupação', color: 'text-amber-600' };
    if (rate < 70) return { label: 'Ocupação moderada', color: 'text-blue-600' };
    return { label: 'Alta ocupação', color: 'text-green-600' };
  };

  const isLoading = appointmentsLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section - Simplificado conforme imagem */}
      <div className="hidden sm:block">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Olá, Dr(a). {profile.full_name?.split(' ')[0]}!
        </h1>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
          Aqui está o resumo do seu dia
        </p>
      </div>

      {/* Stats Cards - Layout com 3 cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Taxa de Ocupação */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium">Taxa de Ocupação</h3>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            </div>
            <div className="mb-2">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {stats.occupancyRate}%
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-xs mb-3">da capacidade</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats.occupancyRate}%` }}
              />
            </div>
            <p className={`text-xs mt-2 ${getOccupancyLevel(stats.occupancyRate).color}`}>
              {getOccupancyLevel(stats.occupancyRate).label}
            </p>
          </CardContent>
        </Card>

        {/* Média Sessões/Paciente */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium">Média Sessões/Paciente</h3>
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            </div>
            <div className="mb-2">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {stats.avgSessionsPerPatient}
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-xs">
              Média de sessões por paciente nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        {/* Pacientes em Risco */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium">Pacientes em Risco</h3>
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            </div>
            <div className="mb-2">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {stats.patientsAtRisk}
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-xs">
              Pacientes sem consulta há mais de 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Section with Tabs */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <Tabs defaultValue="schedule" className="w-full">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <TabsList className="inline-flex h-10 items-center justify-start p-0 bg-transparent w-full">
              <TabsTrigger
                value="schedule"
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 rounded-none hover:text-gray-700 whitespace-nowrap focus-visible:outline-none focus-visible:ring-0 data-[state=active]:bg-transparent"
              >
                Próximo Agendamento
              </TabsTrigger>
              <TabsTrigger
                value="actions"
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 rounded-none hover:text-gray-700 whitespace-nowrap focus-visible:outline-none focus-visible:ring-0 data-[state=active]:bg-transparent"
              >
                Ações Rápidas
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="schedule" className="p-3 sm:p-4 md:p-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                      <div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-1"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-700 dark:text-gray-300">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum agendamento para hoje</p>
              </div>
            ) : (
              <div className="space-y-0">
                {todayAppointments.slice(0, 5).map((apt, index) => (
                  <div
                    key={apt.id}
                    className={`flex items-center justify-between py-2 sm:py-3 gap-2 ${
                      index < todayAppointments.slice(0, 5).length - 1
                        ? 'border-b border-gray-100 dark:border-gray-700'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                      <div className="text-blue-500 shrink-0">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                          {apt.appointment_time}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate">
                          {apt.patient_name}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] sm:text-xs shrink-0 ${
                        apt.status === 'concluido'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : apt.status === 'cancelado'
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                      }`}
                    >
                      {apt.status === 'concluido'
                        ? 'Concluído'
                        : apt.status === 'cancelado'
                        ? 'Cancelado'
                        : 'Agendado'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 sm:mt-4">
              <button className="text-blue-600 text-sm hover:underline font-medium">
                Ver Todos os Agendamentos
              </button>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="p-3 sm:p-4 md:p-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button className="h-10 sm:h-auto py-2 px-3 sm:px-4 text-sm sm:text-base bg-blue-500 hover:bg-blue-600 text-white whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2 shrink-0" />
                <span className="truncate">Novo Paciente</span>
              </Button>
              <Button variant="outline" className="h-10 sm:h-auto py-2 px-3 sm:px-4 text-sm sm:text-base border-gray-300 whitespace-nowrap">
                <Calendar className="w-4 h-4 mr-2 shrink-0" />
                <span className="truncate">Agendar Eventos</span>
              </Button>
              <Button variant="outline" className="h-10 sm:h-auto py-2 px-3 sm:px-4 text-sm sm:text-base border-gray-300 whitespace-nowrap">
                <TrendingUp className="w-4 h-4 mr-2 shrink-0" />
                <span className="truncate">Relatório Financeiro</span>
              </Button>
              <Button variant="outline" className="h-10 sm:h-auto py-2 px-3 sm:px-4 text-sm sm:text-base border-gray-300 whitespace-nowrap">
                <MessageSquare className="w-4 h-4 mr-2 shrink-0" />
                <span className="truncate">Mensagens</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Alerts Section */}
      {stats.patientsAtRisk > 0 && (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Alertas e Notificações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-900 dark:text-amber-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">
                      {stats.patientsAtRisk} paciente{stats.patientsAtRisk !== 1 ? 's' : ''} sem consulta há mais de 30 dias
                    </p>
                    <p className="text-xs mt-1 text-amber-700 dark:text-amber-300">
                      Considere entrar em contato para reativação
                    </p>
                  </div>
                  <button
                    onClick={() => window.location.href = '/patients'}
                    className="text-blue-600 text-xs hover:underline whitespace-nowrap font-medium"
                  >
                    Ver Pacientes
                  </button>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Patient Progress Section */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Evolução dos Pacientes em Tratamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartWidget
            title=""
            data={progressData}
            type="line"
            loading={isLoading}
            height={250}
          />
        </CardContent>
      </Card>
    </div>
  );
}