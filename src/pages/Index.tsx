import { useState, lazy, Suspense } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { IncompleteRegistrationAlert } from '@/components/dashboard/IncompleteRegistrationAlert';
import { CustomizableDashboard } from '@/components/dashboard/CustomizableDashboard';
import { RealtimeActivityFeed } from '@/components/dashboard/RealtimeActivityFeed';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
// ============================================================================
// NOVOS COMPONENTES DE ACESSIBILIDADE E TEMAS
// ============================================================================
import { ThemeProvider, useTheme } from '@/components/ui/theme';
import { SkipLinks, LiveRegion } from '@/components/ui/accessibility/SkipLinks';

// Lazy load dashboard components
const AdminDashboard = lazy(() => import('@/components/dashboard/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PatientDashboard = lazy(() => import('@/components/dashboard/PatientDashboard').then(m => ({ default: m.PatientDashboard })));
const TherapistDashboard = lazy(() => import('@/components/dashboard/TherapistDashboard').then(m => ({ default: m.TherapistDashboard })));

const DashboardSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
    <Skeleton className="h-[400px] w-full" />
  </div>
);

const Index = () => {
  const { profile } = useAuth();
  const { getDisplayName, getInitials, loading: profileLoading } = useUserProfile();
  const [periodFilter, setPeriodFilter] = useState('hoje');

  // Handlers for action buttons
  const handleDownloadReport = () => {
    toast.info('Função de download de relatório em desenvolvimento');
  };

  const handleSettings = () => {
    toast.info('Navegando para configurações...');
    window.location.href = '/marketing/settings';
  };

  const renderDashboard = () => {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        {(() => {
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
        })()}
      </Suspense>
    );
  };

  const displayName = getDisplayName();
  const initials = getInitials();

  return (
    <MainLayout showBreadcrumbs={false}>
      <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-0" data-testid="dashboard-page">
        {/* Header com saudação - Design Moderno e Hero */}
        <div className="relative py-4 sm:py-6 overflow-hidden rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 px-4 sm:px-6" data-testid="dashboard-header">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="relative flex-shrink-0 group">
                <div className="absolute -inset-1 bg-gradient-primary rounded-full blur opacity-25 group-hover:opacity-40 transition duration-300" />
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-white dark:ring-slate-900 shadow-md">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm animate-pulse"></span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider mb-0.5">Visão Geral</p>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight truncate" data-testid="dashboard-welcome-text">
                  {profileLoading ? 'Carregando...' : `Olá, ${displayName.split(' ')[0]}!`}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="hidden sm:flex rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700 font-bold text-xs h-10 px-4" onClick={handleDownloadReport}>
                Baixar Relatório
              </Button>
              <Button size="sm" className="rounded-xl bg-primary text-white shadow-lg shadow-primary/25 font-bold text-xs h-10 px-4" onClick={handleSettings}>
                Configurações
              </Button>
            </div>
          </div>
        </div>

        {/* Filtros tipo chip - Estilizados como pílulas premium */}
        <div className="py-1 overflow-x-auto -mx-1 px-1 scrollbar-hide">
          <div className="flex gap-2.5 min-w-max">
            {['hoje', 'semana', 'mes', 'personalizado'].map((period) => (
              <Button
                key={period}
                variant={periodFilter === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodFilter(period)}
                className={periodFilter === period
                  ? "h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 text-xs font-bold shadow-xl shadow-slate-900/10 transition-all scale-105"
                  : "h-10 rounded-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 px-6 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
                }
              >
                {period === 'hoje' && 'Hoje'}
                {period === 'semana' && 'Semana'}
                {period === 'mes' && 'Mês'}
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
          <div className="lg:col-span-2 xl:col-span-3 order-2 md:order-1" data-testid="today-schedule">
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