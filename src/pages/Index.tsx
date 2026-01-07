import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { PatientDashboard } from '@/components/dashboard/PatientDashboard';
import { TherapistDashboard } from '@/components/dashboard/TherapistDashboard';
import { IncompleteRegistrationAlert } from '@/components/dashboard/IncompleteRegistrationAlert';
import { CustomizableDashboard } from '@/components/dashboard/CustomizableDashboard';
import { RealtimeActivityFeed } from '@/components/dashboard/RealtimeActivityFeed';
import { useAuth } from '@/contexts/AuthContextProvider';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { profile } = useAuth();
  const { getDisplayName, getInitials, loading: profileLoading } = useUserProfile();
  const [periodFilter, setPeriodFilter] = useState('hoje');

  const renderDashboard = () => {
    if (!profile) return <AdminDashboard period={periodFilter} />;
    
    switch (profile.role) {
      case 'admin':
        return <AdminDashboard period={periodFilter} />;
      case 'fisioterapeuta':
        return <TherapistDashboard lastUpdate={new Date()} profile={{ id: '1', user_id: '1', role: 'admin' as const, full_name: 'Fisioterapeuta', avatar_url: '', onboarding_completed: true, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' }} />;
      case 'paciente':
        return <PatientDashboard lastUpdate={new Date()} profile={{ id: '1', user_id: '1', role: 'admin' as const, full_name: 'Paciente', avatar_url: '', onboarding_completed: true, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' }} />;
      default:
        return <AdminDashboard period={periodFilter} />;
    }
  };

  const displayName = getDisplayName();
  const initials = getInitials();

  return (
    <MainLayout showBreadcrumbs={false}>
      <div className="space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
        {/* Header com saudação - estilo Stich */}
        <div className="flex items-center justify-between py-2 sm:py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 ring-2 ring-slate-100 dark:ring-slate-800">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-background-dark"></span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-medium text-muted-foreground">Bem-vindo de volta,</h1>
              <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight truncate max-w-[200px] sm:max-w-none">
                {profileLoading ? 'Carregando...' : displayName}
              </h2>
            </div>
          </div>
        </div>

        {/* Filtros tipo chip - estilo Stich */}
        <div className="py-1 sm:py-2 overflow-x-auto -mx-1 px-1">
          <div className="flex gap-2">
            {['hoje', 'semana', 'mes', 'personalizado'].map((period) => (
              <Button
                key={period}
                variant={periodFilter === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodFilter(period)}
                className={periodFilter === period 
                  ? "h-7 sm:h-8 rounded-full bg-primary text-primary-foreground px-3 sm:px-4 text-[10px] sm:text-xs font-semibold shadow-sm whitespace-nowrap" 
                  : "h-7 sm:h-8 rounded-full bg-card border border-border text-muted-foreground px-3 sm:px-4 text-[10px] sm:text-xs font-medium hover:bg-accent whitespace-nowrap"
                }
              >
                {period === 'hoje' && 'Hoje'}
                {period === 'semana' && <><span className="hidden sm:inline">Esta </span>Semana</>}
                {period === 'mes' && <><span className="hidden sm:inline">Este </span>Mês</>}
                {period === 'personalizado' && 'Custom'}
              </Button>
            ))}
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