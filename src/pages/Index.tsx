import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { TherapistDashboard } from '@/components/dashboard/TherapistDashboard';
import { PatientDashboard } from '@/components/dashboard/PatientDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Index = () => {
  const { profile, loading } = useAuth();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-fade-in">
          {/* Loading skeleton */}
          <div className="bg-gradient-primary rounded-xl p-6">
            <Skeleton className="h-8 w-64 mb-2 bg-primary-foreground/20" />
            <Skeleton className="h-4 w-96 bg-primary-foreground/20" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gradient-card p-6 rounded-xl border border-border">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Não foi possível carregar as informações do perfil. Tente fazer login novamente.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  const renderDashboard = () => {
    switch (profile.role) {
      case 'admin':
        return <AdminDashboard lastUpdate={lastUpdate} />;
      case 'fisioterapeuta':
      case 'estagiario':
        return <TherapistDashboard lastUpdate={lastUpdate} profile={profile} />;
      case 'paciente':
        return <PatientDashboard lastUpdate={lastUpdate} profile={profile} />;
      default:
        return <TherapistDashboard lastUpdate={lastUpdate} profile={profile} />;
    }
  };

  return (
    <MainLayout>
      {renderDashboard()}
    </MainLayout>
  );
};

export default Index;
