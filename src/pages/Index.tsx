import { MainLayout } from '@/components/layout/MainLayout';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { PatientDashboard } from '@/components/dashboard/PatientDashboard';
import { TherapistDashboard } from '@/components/dashboard/TherapistDashboard';
import { IncompleteRegistrationAlert } from '@/components/dashboard/IncompleteRegistrationAlert';
import { CustomizableDashboard } from '@/components/dashboard/CustomizableDashboard';
import { RealtimeActivityFeed } from '@/components/dashboard/RealtimeActivityFeed';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { userProfile } = useAuth();

  const renderDashboard = () => {
    if (!userProfile) return <AdminDashboard />;
    
    switch (userProfile.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'therapist':
        return <TherapistDashboard lastUpdate={new Date()} profile={{ id: '1', user_id: '1', role: 'admin' as const, full_name: 'Fisioterapeuta', avatar_url: '', onboarding_completed: true, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' }} />;
      case 'patient':
        return <PatientDashboard lastUpdate={new Date()} profile={{ id: '1', user_id: '1', role: 'admin' as const, full_name: 'Paciente', avatar_url: '', onboarding_completed: true, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' }} />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
        {/* Header moderno com gradiente */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Dashboard FisioFlow
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Bem-vindo! Aqui está uma visão geral da sua clínica
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Alerta de cadastros incompletos */}
        <IncompleteRegistrationAlert />
        
        {/* Dashboard Customizável */}
        <CustomizableDashboard />
        
        {/* Grid de conteúdo */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Dashboard principal */}
          <div className="lg:col-span-2">
            {renderDashboard()}
          </div>
          
          {/* Feed de atividades em tempo real */}
          <div className="lg:col-span-1">
            <RealtimeActivityFeed />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;