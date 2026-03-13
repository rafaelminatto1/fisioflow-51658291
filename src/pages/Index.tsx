import { useState, lazy, Suspense } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity,
  Calendar,
  Download,
  LayoutGrid,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { IncompleteRegistrationAlert } from '@/components/dashboard/IncompleteRegistrationAlert';
import { CustomizableDashboard } from '@/components/dashboard/CustomizableDashboard';
import { RealtimeActivityFeed } from '@/components/dashboard/RealtimeActivityFeed';
import { DashboardNotificationWidget } from '@/components/dashboard/DashboardNotificationWidget';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DashboardPeriod } from '@/hooks/useDashboardMetrics';

const AdminDashboard = lazy(() => import('@/components/dashboard/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const PatientDashboard = lazy(() => import('@/components/dashboard/PatientDashboard').then((m) => ({ default: m.PatientDashboard })));
const TherapistDashboard = lazy(() => import('@/components/dashboard/TherapistDashboard').then((m) => ({ default: m.TherapistDashboard })));

const periodOptions: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Mês atual' },
  { value: 'personalizado', label: 'Personalizado' },
];

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton className="h-32 w-full rounded-[2rem]" />
      <Skeleton className="h-32 w-full rounded-[2rem]" />
      <Skeleton className="h-32 w-full rounded-[2rem]" />
      <Skeleton className="h-32 w-full rounded-[2rem]" />
    </div>
    <Skeleton className="h-[420px] w-full rounded-[2rem]" />
  </div>
);

const Index = () => {
  const { profile } = useAuth();
  const { getDisplayName, getInitials, loading: profileLoading } = useUserProfile();
  const [periodFilter, setPeriodFilter] = useState<DashboardPeriod>('hoje');

  const handleDownloadReport = () => {
    toast.info('Gerando relatório consolidado...');
  };

  const handleSettings = () => {
    window.location.href = '/settings';
  };

  const renderDashboard = () => (
    <Suspense fallback={<DashboardSkeleton />}>
      {(() => {
        if (!profile) return <AdminDashboard period={periodFilter} />;

        switch (profile.role) {
          case 'admin':
            return <AdminDashboard period={periodFilter} />;
          case 'fisioterapeuta':
            return <TherapistDashboard lastUpdate={new Date()} profile={profile} period={periodFilter} />;
          case 'paciente':
            return <PatientDashboard _lastUpdate={new Date()} profile={profile} />;
          default:
            return <AdminDashboard period={periodFilter} />;
        }
      })()}
    </Suspense>
  );

  const displayName = getDisplayName();
  const initials = getInitials();
  const primaryName = displayName.split(' ')[0] || 'Dr.';
  const roleLabel =
    profile?.role === 'admin'
      ? 'Admin'
      : profile?.role === 'fisioterapeuta'
        ? 'Fisioterapeuta'
        : profile?.role === 'paciente'
          ? 'Paciente'
          : 'Equipe clínica';
  const selectedPeriodLabel =
    periodOptions.find((option) => option.value === periodFilter)?.label || 'Hoje';

  return (
    <MainLayout showBreadcrumbs={false}>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute left-[-10%] top-[-8%] h-[36%] w-[36%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[12%] right-[-6%] h-[28%] w-[28%] rounded-full bg-sky-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 space-y-6 animate-fade-in pb-16 md:pb-10" data-testid="dashboard-page">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_340px]">
          <section
            className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/55 p-6 shadow-premium-lg backdrop-blur-xl dark:border-slate-800/30 dark:bg-slate-900/45"
            data-testid="dashboard-header"
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-primary via-sky-400 to-emerald-400 opacity-30 blur transition duration-500" />
                    <Avatar className="relative z-10 h-20 w-20 ring-4 ring-white shadow-2xl dark:ring-slate-950">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-slate-900 to-slate-800 text-2xl font-black uppercase text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-1 right-1 z-20 h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-950" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                        Painel principal
                      </span>
                    </div>

                    <h1
                      className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl"
                      data-testid="dashboard-welcome-text"
                    >
                      {profileLoading ? 'Carregando...' : `Olá, ${primaryName}!`}
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                      Acompanhe sinais da clínica, ajuste o período e priorize o que precisa de ação sem percorrer uma página solta.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[320px] lg:max-w-[360px]">
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Perfil
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{roleLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Período
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{selectedPeriodLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Status
                    </p>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Sistema online
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 border-t border-border/50 pt-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {periodOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={periodFilter === option.value ? 'default' : 'outline'}
                        onClick={() => setPeriodFilter(option.value)}
                        className={cn(
                          'h-10 rounded-2xl px-5 text-[10px] font-black uppercase tracking-[0.15em] transition-all',
                          periodFilter === option.value
                            ? 'scale-[1.02] bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                            : 'border-border/60 bg-background/70 text-slate-500 hover:border-primary/35 hover:text-primary'
                        )}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <Button
                    variant="outline"
                    className="h-11 justify-start rounded-2xl border-border/60 bg-background/75 px-5 text-[11px] font-black uppercase tracking-[0.16em] hover:border-primary/35 hover:text-primary"
                    onClick={handleDownloadReport}
                  >
                    <Download className="mr-2 h-4 w-4 text-primary" />
                    Exportar dados
                  </Button>
                  <Button
                    className="h-11 justify-start rounded-2xl px-5 text-[11px] font-black uppercase tracking-[0.16em] shadow-lg shadow-slate-900/15"
                    onClick={handleSettings}
                  >
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Ajustes
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-border/60 bg-background/75 p-5 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/75">
                  Centro de comando
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">Leitura rápida</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Prioridade
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">
                  Revise pendencias, notificacoes recentes e os KPIs do periodo atual sem mudar de tela.
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Operacao
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">
                  Periodo ativo: <span className="text-primary">{selectedPeriodLabel}</span>
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_340px]">
          <div className="space-y-6" data-testid="today-schedule">
            <IncompleteRegistrationAlert />
            <CustomizableDashboard />
            {renderDashboard()}
          </div>

          <div className="xl:sticky xl:top-24 xl:self-start">
            <div className="space-y-6">
              <DashboardNotificationWidget />
              <RealtimeActivityFeed />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
