import { MainLayout } from '@/components/layout/MainLayout';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { PatientDashboard } from '@/components/dashboard/PatientDashboard';
import { TherapistDashboard } from '@/components/dashboard/TherapistDashboard';
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
      <div className="space-y-6 animate-fade-in">
        {/* Header moderno com gradiente */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Dashboard FisioFlow
              </h1>
              <p className="text-muted-foreground">
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
        
        {/* Dashboard content */}
        <div className="w-full">
          {renderDashboard()}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;