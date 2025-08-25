import { MainLayout } from '@/components/layout/MainLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ActivityChart } from '@/components/dashboard/ActivityChart';
import { RecentPatients } from '@/components/dashboard/RecentPatients';
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments';
import { NewPatientModal } from '@/components/modals/NewPatientModal';
import { NewAppointmentModal } from '@/components/modals/NewAppointmentModal';
import { useData } from '@/contexts/DataContext';
import { 
  Users, 
  Calendar, 
  Activity, 
  DollarSign,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isToday } from 'date-fns';

const Index = () => {
  const { patients, appointments } = useData();
  const navigate = useNavigate();

  // Calculate statistics
  const totalPatients = patients.length;
  const todayAppointments = appointments.filter(apt => isToday(apt.date));
  const pendingAppointments = todayAppointments.filter(apt => apt.status === 'Pendente');
  const treatmentPatients = patients.filter(p => p.status === 'Em Tratamento');
  const avgProgress = patients.length > 0 ? Math.round(patients.reduce((acc, p) => acc + p.progress, 0) / patients.length) : 0;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div className="bg-gradient-primary rounded-xl p-6 text-primary-foreground shadow-medical">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Bem-vindo ao FisioFlow</h1>
              <p className="text-primary-foreground/90">
                Gerencie sua clínica de fisioterapia de forma eficiente e profissional
              </p>
            </div>
            <div className="hidden md:block">
              <Activity className="w-16 h-16 text-primary-foreground/80" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total de Pacientes"
            value={totalPatients.toString()}
            change={treatmentPatients.length > 0 ? `${treatmentPatients.length} em tratamento` : 'Nenhum em tratamento'}
            changeType={treatmentPatients.length > 0 ? 'positive' : 'neutral'}
            icon={<Users className="w-5 h-5 text-primary" />}
            gradient
          />
          <StatsCard
            title="Consultas Hoje"
            value={todayAppointments.length.toString()}
            change={pendingAppointments.length > 0 ? `${pendingAppointments.length} pendentes` : 'Todas confirmadas'}
            changeType={pendingAppointments.length > 0 ? 'negative' : 'positive'}
            icon={<Calendar className="w-5 h-5 text-secondary" />}
          />
          <StatsCard
            title="Progresso Médio"
            value={`${avgProgress}%`}
            change={avgProgress >= 70 ? 'Excelente progresso' : avgProgress >= 50 ? 'Bom progresso' : 'Progresso inicial'}
            changeType={avgProgress >= 70 ? 'positive' : avgProgress >= 50 ? 'neutral' : 'negative'}
            icon={<TrendingUp className="w-5 h-5 text-secondary" />}
          />
          <StatsCard
            title="Próximos Agendamentos"
            value={appointments.filter(apt => apt.date > new Date()).length.toString()}
            change="Esta semana"
            changeType="neutral"
            icon={<Clock className="w-5 h-5 text-primary" />}
          />
        </div>

        {/* Charts and Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ActivityChart />
          <UpcomingAppointments />
        </div>

        {/* Recent Patients */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentPatients />
          
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
              <button 
                onClick={() => navigate('/exercises')}
                className="p-4 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors text-center"
              >
                <Activity className="w-6 h-6 text-primary mx-auto mb-2" />
                <span className="text-sm font-medium text-foreground">Exercícios</span>
              </button>
              <button 
                onClick={() => navigate('/schedule')}
                className="p-4 bg-secondary/10 hover:bg-secondary/20 rounded-lg transition-colors text-center"
              >
                <Clock className="w-6 h-6 text-secondary mx-auto mb-2" />
                <span className="text-sm font-medium text-foreground">Agenda</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
