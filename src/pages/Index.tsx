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
import { Calendar, Download, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// Lazy load dashboard components
const AdminDashboard = lazy(() => import('@/components/dashboard/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PatientDashboard = lazy(() => import('@/components/dashboard/PatientDashboard').then(m => ({ default: m.PatientDashboard })));
const TherapistDashboard = lazy(() => import('@/components/dashboard/TherapistDashboard').then(m => ({ default: m.TherapistDashboard })));

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Skeleton className="h-40 w-full rounded-[2.5rem]" />
      <Skeleton className="h-40 w-full rounded-[2.5rem]" />
      <Skeleton className="h-40 w-full rounded-[2.5rem]" />
      <Skeleton className="h-40 w-full rounded-[2.5rem]" />
    </div>
    <Skeleton className="h-[500px] w-full rounded-[3rem]" />
  </div>
);

const Index = () => {
  const { profile } = useAuth();
  const { getDisplayName, getInitials, loading: profileLoading } = useUserProfile();
  const [periodFilter, setPeriodFilter] = useState('hoje');

  // Handlers for action buttons
  const handleDownloadReport = () => {
    toast.info('Gerando relatório consolidado...');
  };

  const handleSettings = () => {
    window.location.href = '/settings';
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
      {/* Background decoration elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 space-y-8 sm:space-y-10 animate-fade-in pb-20 md:pb-10" data-testid="dashboard-page">
        {/* Header Hero Section */}
        <div className="relative p-6 sm:p-10 overflow-hidden rounded-[3rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/20 shadow-premium-lg group" data-testid="dashboard-header">
          {/* Animated decorative patterns */}
          <div className="absolute top-0 right-0 p-10 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity duration-1000">
            <Sparkles className="w-64 h-64 text-primary rotate-12" />
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-6 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1.5 bg-gradient-to-tr from-primary via-blue-400 to-emerald-400 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-500" />
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-white dark:ring-slate-950 shadow-2xl relative z-10">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-slate-900 to-slate-800 text-white font-black text-2xl uppercase">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-1 right-1 h-5 w-5 bg-emerald-500 rounded-full ring-4 ring-white dark:ring-slate-950 shadow-md z-20 animate-pulse" />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
                  <Sparkles className="w-3 h-3 text-primary animate-wiggle" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Dashboard Elite</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-2" data-testid="dashboard-welcome-text">
                  {profileLoading ? 'Carregando...' : `Olá, ${displayName.split(' ')[0]}!`}
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
                  <Calendar className="w-4 h-4 text-primary" />
                  {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  <span className="hidden sm:inline opacity-30">|</span>
                  <span className="hidden sm:inline bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-tighter">Sistema Online</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border-border/50 hover:border-primary/50 font-black text-[10px] uppercase tracking-widest h-14 px-8 shadow-sm transition-all hover:shadow-premium-md" 
                onClick={handleDownloadReport}
              >
                <Download className="w-4 h-4 mr-2 text-primary" />
                Exportar Dados
              </Button>
              <Button 
                className="rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 active:scale-95 font-black text-[10px] uppercase tracking-widest h-14 px-8 shadow-xl shadow-slate-900/20 dark:shadow-white/10 transition-all" 
                onClick={handleSettings}
              >
                <SettingsIcon className="w-4 h-4 mr-2" />
                Ajustes
              </Button>
            </div>
          </div>
        </div>

        {/* Action Filters Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Filtrar Visualização</h3>
            <div className="h-px flex-1 mx-6 bg-gradient-to-r from-border/50 to-transparent" />
          </div>
          
          <div className="py-2 overflow-x-auto -mx-2 px-2 scrollbar-hide">
            <div className="flex gap-3 min-w-max">
              {['hoje', 'semana', 'mes', 'personalizado'].map((period) => (
                <Button
                  key={period}
                  variant={periodFilter === period ? 'default' : 'outline'}
                  onClick={() => setPeriodFilter(period)}
                  className={cn(
                    "h-12 rounded-2xl px-8 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                    periodFilter === period
                      ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105 ring-2 ring-primary/20"
                      : "bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-border/50 text-slate-500 hover:border-primary/50 hover:text-primary"
                  )}
                >
                  {period === 'hoje' && 'Hoje'}
                  {period === 'semana' && 'Esta Semana'}
                  {period === 'mes' && 'Mês Atual'}
                  {period === 'personalizado' && 'Personalizado'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <IncompleteRegistrationAlert />

        <CustomizableDashboard />

        {/* Content Layout Grid */}
        <div className="grid gap-8 grid-cols-1 lg:grid-cols-12">
          {/* Main Dashboard Area */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-8" data-testid="today-schedule">
            {renderDashboard()}
          </div>

          {/* Activity Feed Sidebar Area */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24">
              <RealtimeActivityFeed />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
