import { MainLayout } from '@/components/layout/MainLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ActivityChart } from '@/components/dashboard/ActivityChart';
import { RecentPatients } from '@/components/dashboard/RecentPatients';
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments';
import { 
  Users, 
  Calendar, 
  Activity, 
  DollarSign,
  TrendingUp,
  Clock
} from 'lucide-react';

const Index = () => {
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
            value="156"
            change="+12% este mês"
            changeType="positive"
            icon={<Users className="w-5 h-5 text-primary" />}
            gradient
          />
          <StatsCard
            title="Consultas Hoje"
            value="8"
            change="2 pendentes"
            changeType="neutral"
            icon={<Calendar className="w-5 h-5 text-secondary" />}
          />
          <StatsCard
            title="Taxa de Recuperação"
            value="87%"
            change="+5% este mês"
            changeType="positive"
            icon={<TrendingUp className="w-5 h-5 text-secondary" />}
          />
          <StatsCard
            title="Faturamento Mensal"
            value="R$ 24.500"
            change="+18% vs mês anterior"
            changeType="positive"
            icon={<DollarSign className="w-5 h-5 text-primary" />}
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
              <button className="p-4 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors text-center">
                <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                <span className="text-sm font-medium text-foreground">Novo Paciente</span>
              </button>
              <button className="p-4 bg-secondary/10 hover:bg-secondary/20 rounded-lg transition-colors text-center">
                <Calendar className="w-6 h-6 text-secondary mx-auto mb-2" />
                <span className="text-sm font-medium text-foreground">Agendar</span>
              </button>
              <button className="p-4 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors text-center">
                <Activity className="w-6 h-6 text-primary mx-auto mb-2" />
                <span className="text-sm font-medium text-foreground">Exercícios</span>
              </button>
              <button className="p-4 bg-secondary/10 hover:bg-secondary/20 rounded-lg transition-colors text-center">
                <Clock className="w-6 h-6 text-secondary mx-auto mb-2" />
                <span className="text-sm font-medium text-foreground">Relatórios</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
