import { useState, useEffect } from 'react';
import { StatCard } from './StatCard';
import { AppointmentWidget } from './AppointmentWidget';
import { ChartWidget } from './ChartWidget';
import { RecentPatients } from './RecentPatients';
import { NewPatientModal } from '@/components/modals/NewPatientModal';
import { NewAppointmentModal } from '@/components/modals/NewAppointmentModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { format, isToday, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminDashboardProps {
  lastUpdate: Date;
}

export function AdminDashboard({ lastUpdate }: AdminDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePatients: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
    occupancyRate: 0
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [pendingTasks, setPendingTasks] = useState(0);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load patients
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('*');

      if (patientsError) throw patientsError;

      // Load today's appointments
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(name, phone)
        `)
        .eq('appointment_date', today)
        .order('appointment_time');

      if (appointmentsError) throw appointmentsError;

      // Calculate stats
      const activePatients = patients?.filter(p => p.status === 'Em Tratamento').length || 0;
      const todayAppts = appointments?.length || 0;

      // Generate mock revenue data for the last 6 months
      const revenueChartData = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthName = format(date, 'MMM', { locale: ptBR });
        const revenue = Math.floor(Math.random() * 50000) + 20000; // Mock data
        revenueChartData.push({
          name: monthName,
          value: revenue
        });
      }

      setStats({
        totalPatients: patients?.length || 0,
        activePatients,
        todayAppointments: todayAppts,
        monthlyRevenue: 45000, // Mock data
        occupancyRate: Math.round((todayAppts / 20) * 100) // Assuming 20 slots per day
      });

      setTodayAppointments(appointments?.map(apt => ({
        id: apt.id,
        patient_name: apt.patients?.name || 'Paciente',
        appointment_time: apt.appointment_time,
        appointment_date: apt.appointment_date,
        status: apt.status,
        type: apt.type,
        room: apt.room,
        patient_phone: apt.patients?.phone
      })) || []);

      setRevenueData(revenueChartData);
      setPendingTasks(Math.floor(Math.random() * 5) + 1); // Mock data

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
  };

  useEffect(() => {
    loadDashboardData();

    // Set up real-time subscriptions
    const appointmentsSubscription = supabase
      .channel('admin-appointments')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' },
        () => loadDashboardData()
      )
      .subscribe();

    const patientsSubscription = supabase
      .channel('admin-patients')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'patients' },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsSubscription);
      supabase.removeChannel(patientsSubscription);
    };
  }, [lastUpdate]);

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'Confirmado' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Consulta confirmada com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível confirmar a consulta.",
        variant: "destructive"
      });
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'Cancelado' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Consulta cancelada com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a consulta.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-primary rounded-xl p-6 text-primary-foreground shadow-medical">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Dashboard Administrativo</h1>
            <p className="text-primary-foreground/90">
              Visão geral da clínica e métricas importantes
            </p>
          </div>
          <div className="hidden md:block">
            <TrendingUp className="w-16 h-16 text-primary-foreground/80" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Pacientes Ativos"
          value={stats.activePatients}
          change={`${stats.totalPatients} total`}
          changeType="positive"
          icon={<Users className="w-5 h-5 text-primary" />}
          gradient
          loading={loading}
        />
        <StatCard
          title="Consultas Hoje"
          value={stats.todayAppointments}
          change={stats.todayAppointments > 10 ? 'Dia movimentado' : 'Dia tranquilo'}
          changeType={stats.todayAppointments > 10 ? 'positive' : 'neutral'}
          icon={<Calendar className="w-5 h-5 text-secondary" />}
          loading={loading}
        />
        <StatCard
          title="Faturamento Mensal"
          value={`R$ ${stats.monthlyRevenue.toLocaleString('pt-BR')}`}
          change="+12% vs mês anterior"
          changeType="positive"
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          loading={loading}
        />
        <StatCard
          title="Taxa de Ocupação"
          value={`${stats.occupancyRate}%`}
          change={stats.occupancyRate > 80 ? 'Alta demanda' : 'Capacidade disponível'}
          changeType={stats.occupancyRate > 80 ? 'positive' : 'neutral'}
          icon={<Activity className="w-5 h-5 text-blue-600" />}
          loading={loading}
        />
      </div>

      {/* Charts and Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartWidget
            title="Evolução do Faturamento (Últimos 6 Meses)"
            data={revenueData}
            type="line"
            loading={loading}
            showFilters
            height={350}
          />
        </div>
        <AppointmentWidget
          title="Agenda de Hoje"
          appointments={todayAppointments}
          loading={loading}
          showActions
          onConfirm={handleConfirmAppointment}
          onCancel={handleCancelAppointment}
        />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentPatients />
        
        {/* Tasks and Quick Actions */}
        <div className="space-y-6">
          {/* Pending Tasks */}
          <div className="bg-gradient-card p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Tarefas Pendentes
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-foreground">Confirmar consultas da semana</span>
                <StatCard
                  title=""
                  value={pendingTasks}
                  loading={loading}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-foreground">Relatórios mensais</span>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-card p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Ações Rápidas</h3>
            <div className="grid grid-cols-2 gap-4">
              <NewPatientModal
                trigger={
                  <button className="p-4 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors text-center w-full">
                    <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                    <span className="text-sm font-medium text-foreground">Novo Paciente</span>
                  </button>
                }
              />
              <NewAppointmentModal
                trigger={
                  <button className="p-4 bg-secondary/10 hover:bg-secondary/20 rounded-lg transition-colors text-center w-full">
                    <Calendar className="w-6 h-6 text-secondary mx-auto mb-2" />
                    <span className="text-sm font-medium text-foreground">Agendar</span>
                  </button>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}