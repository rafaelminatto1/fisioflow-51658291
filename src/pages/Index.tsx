import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { PatientDashboard } from '@/components/dashboard/PatientDashboard';
import { TherapistDashboard } from '@/components/dashboard/TherapistDashboard';
import { IncompleteRegistrationAlert } from '@/components/dashboard/IncompleteRegistrationAlert';
import { CustomizableDashboard } from '@/components/dashboard/CustomizableDashboard';
import { RealtimeActivityFeed } from '@/components/dashboard/RealtimeActivityFeed';
import { useAuth } from '@/contexts/AuthContext';
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
        return <TherapistDashboard lastUpdate={new Date()} profile={profile} />;
      case 'paciente':
        return <PatientDashboard lastUpdate={new Date()} profile={profile} />;
      default:
        return <AdminDashboard period={periodFilter} />;
    }
  };

  const displayName = getDisplayName();
  const initials = getInitials();

  return (
    <MainLayout showBreadcrumbs={false}>
      <div className="space-y-3 sm:space-y-4 md:space-y-6 animate-fade-in pb-20 md:pb-0">
        {/* Header com saudação - Melhorado para mobile/tablet */}
        <div className="flex items-center justify-between py-2 sm:py-3 px-1">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <Avatar className="h-11 w-11 sm:h-10 sm:w-10 ring-2 ring-slate-100 dark:ring-slate-800 shadow-sm">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-background-dark shadow-sm"></span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">Bem-vindo de volta,</p>
              <h2 className="text-base sm:text-sm md:text-base font-bold text-foreground leading-tight truncate">
                {profileLoading ? 'Carregando...' : displayName}
              </h2>
            </div>
          </div>
        </div>

        {/* Filtros tipo chip - Otimizado para touch em mobile/tablet */}
        <div className="py-1 sm:py-2 overflow-x-auto -mx-1 px-1 scrollbar-hide">
          <div className="flex gap-2 min-w-max sm:min-w-0">
            {['hoje', 'semana', 'mes', 'personalizado'].map((period) => (
              <Button
                key={period}
                variant={periodFilter === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodFilter(period)}
                className={periodFilter === period
                  ? "h-9 sm:h-8 rounded-full bg-gradient-primary text-primary-foreground px-4 sm:px-4 text-xs sm:text-xs font-semibold shadow-md hover:shadow-lg whitespace-nowrap touch-target transition-all"
                  : "h-9 sm:h-8 rounded-full bg-card border border-border text-muted-foreground px-4 sm:px-4 text-xs sm:text-xs font-medium hover:bg-accent/80 hover:text-foreground whitespace-nowrap touch-target transition-all"
                }
              >
                {period === 'hoje' && 'Hoje'}
                {period === 'semana' && <><span className="hidden xs:inline">Esta </span>Semana</>}
                {period === 'mes' && <><span className="hidden xs:inline">Este </span>Mês</>}
                {period === 'personalizado' && 'Personalizado'}
              </Button>
            ))}
          </div>
        </div>

        {/* Alerta de cadastros incompletos */}
        <IncompleteRegistrationAlert />

        {/* Dashboard Customizável */}
        <CustomizableDashboard />

        {/* Grid de conteúdo - Responsivo para iPhone e iPad */}
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Dashboard principal - Ocupa mais espaço em telas maiores */}
          <div className="lg:col-span-2 xl:col-span-3 order-2 md:order-1">
            {renderDashboard()}
          </div>

          {/* Feed de atividades em tempo real - Full width em mobile */}
          <div className="lg:col-span-1 xl:col-span-1 order-1 md:order-2">
            <RealtimeActivityFeed />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;