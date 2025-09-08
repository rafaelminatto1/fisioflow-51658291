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
        return <TherapistDashboard />;
      case 'patient':
        return <PatientDashboard />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header responsivo */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
              Dashboard FisioFlow
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Bem-vindo ao sistema de gestão de fisioterapia
            </p>
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