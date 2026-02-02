import { MainLayout } from '@/components/layout/MainLayout';
import { ScheduleCapacityManager } from '@/components/schedule/ScheduleCapacityManager';
import { BusinessHoursManager } from '@/components/schedule/settings/BusinessHoursManager';
import { CancellationRulesManager } from '@/components/schedule/settings/CancellationRulesManager';
import { NotificationSettingsManager } from '@/components/schedule/settings/NotificationSettingsManager';
import { BlockedTimesManager } from '@/components/schedule/settings/BlockedTimesManager';
import { StatusColorManager } from '@/components/schedule/settings/StatusColorManager';
import { CardSizeManager } from '@/components/schedule/settings/CardSizeManager';
import { CalendarViewPresets } from '@/components/schedule/settings/CalendarViewPresets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Clock, Users, Bell, AlertTriangle, CalendarOff, Palette, Frame, ArrowLeft, Info, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useScheduleSettings } from '@/hooks/useScheduleSettings';
import { useScheduleCapacity } from '@/hooks/useScheduleCapacity';

export default function ScheduleSettings() {
  const [activeTab, setActiveTab] = useState('capacity');
  const [hasChanges, setHasChanges] = useState(false);

  // Pré-carrega dados uma vez na página para que as abas não mostrem "Carregando..." individualmente
  const scheduleSettings = useScheduleSettings();
  const scheduleCapacity = useScheduleCapacity();
  const isInitialLoading =
    scheduleSettings.isLoadingHours ||
    scheduleSettings.isLoadingRules ||
    scheduleSettings.isLoadingNotifications ||
    scheduleSettings.isLoadingBlocked ||
    scheduleCapacity.isLoading;

  // Track changes indicator
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const tabInfo = {
    capacity: { title: 'Capacidade', description: 'Configure vagas por dia da semana', icon: Users, color: 'from-green-500 to-emerald-500' },
    hours: { title: 'Horários de Funcionamento', description: 'Defina horários de atendimento', icon: Clock, color: 'from-blue-500 to-indigo-500' },
    cancellation: { title: 'Regras de Cancelamento', description: 'Políticas e prazos para cancelamentos', icon: AlertTriangle, color: 'from-amber-500 to-orange-500' },
    notifications: { title: 'Notificações', description: 'Alertas e lembretes automáticos', icon: Bell, color: 'from-violet-500 to-purple-500' },
    blocked: { title: 'Horários Bloqueados', description: 'Gerencie períodos indisponíveis', icon: CalendarOff, color: 'from-red-500 to-rose-500' },
    status: { title: 'Cores de Status', description: 'Personalize as cores dos agendamentos', icon: Palette, color: 'from-pink-500 to-fuchsia-500' },
    cardsize: { title: 'Aparência', description: 'Tamanho dos cards e layout', icon: Frame, color: 'from-cyan-500 to-sky-500' },
    presets: { title: 'Presets', description: 'Configurações otimizadas', icon: Sparkles, color: 'from-purple-500 to-pink-500' },
  };

  const currentTab = tabInfo[activeTab as keyof typeof tabInfo];
  const TabIcon = currentTab.icon;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="flex items-center gap-4 pb-2">
          <Link to="/schedule">
            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Configurações da Agenda</h1>
            <p className="text-muted-foreground mt-1">
              Personalize horários, capacidade, cores e aparência da sua agenda
            </p>
          </div>
          {hasChanges && (
            <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Alterações não salvas
            </Badge>
          )}
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Configurações aplicadas em tempo real
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              As alterações feitas aqui afetam imediatamente a visualização da agenda para todos os usuários.
            </p>
          </div>
        </div>

        <Tabs
          defaultValue="capacity"
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setHasChanges(false);
          }}
          className="space-y-6"
        >
          {/* Enhanced Tabs List with better visual feedback */}
          <div className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 h-auto gap-2 bg-muted/30 p-1.5 rounded-xl border border-border/50">
              <TabsTrigger
                value="capacity"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md rounded-lg transition-all data-[state=active]:border data-[state=active]:border-border/50 flex-col gap-1 h-auto py-3"
              >
                <Users className="h-4 w-4" />
                <span className="text-xs">Capacidade</span>
              </TabsTrigger>
              <TabsTrigger
                value="hours"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md rounded-lg transition-all data-[state=active]:border data-[state=active]:border-border/50 flex-col gap-1 h-auto py-3"
              >
                <Clock className="h-4 w-4" />
                <span className="text-xs">Horários</span>
              </TabsTrigger>
              <TabsTrigger
                value="cancellation"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md rounded-lg transition-all data-[state=active]:border data-[state=active]:border-border/50 flex-col gap-1 h-auto py-3"
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Cancelamento</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md rounded-lg transition-all data-[state=active]:border data-[state=active]:border-border/50 flex-col gap-1 h-auto py-3"
              >
                <Bell className="h-4 w-4" />
                <span className="text-xs">Notificações</span>
              </TabsTrigger>
              <TabsTrigger
                value="blocked"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md rounded-lg transition-all data-[state=active]:border data-[state=active]:border-border/50 flex-col gap-1 h-auto py-3"
              >
                <CalendarOff className="h-4 w-4" />
                <span className="text-xs">Bloqueios</span>
              </TabsTrigger>
              <TabsTrigger
                value="status"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md rounded-lg transition-all data-[state=active]:border data-[state=active]:border-border/50 flex-col gap-1 h-auto py-3"
              >
                <Palette className="h-4 w-4" />
                <span className="text-xs">Cores</span>
              </TabsTrigger>
              <TabsTrigger
                value="cardsize"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md rounded-lg transition-all data-[state=active]:border data-[state=active]:border-border/50 flex-col gap-1 h-auto py-3"
              >
                <Frame className="h-4 w-4" />
                <span className="text-xs">Aparência</span>
              </TabsTrigger>
              <TabsTrigger
                value="presets"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md rounded-lg transition-all data-[state=active]:border data-[state=active]:border-border/50 flex-col gap-1 h-auto py-3"
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-xs">Presets</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Info Banner */}
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300",
              "bg-gradient-to-r opacity-0 animate-in fade-in slide-in-from-top-2 duration-300",
              currentTab.color.replace('to-', 'from-50 dark:to-950/30 ').replace('from-', 'to-50 dark:from-950/30 ')
            )}>
              <div className={cn(
                "p-2 rounded-lg",
                `bg-gradient-to-br ${currentTab.color}`
              )}>
                <TabIcon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{currentTab.title}</p>
                <p className="text-xs text-muted-foreground">{currentTab.description}</p>
              </div>
            </div>
          </div>

          <TabsContent value="capacity" className="focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ScheduleCapacityManager />
          </TabsContent>

          <TabsContent value="hours" className="focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <BusinessHoursManager />
          </TabsContent>

          <TabsContent value="cancellation" className="focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CancellationRulesManager />
          </TabsContent>

          <TabsContent value="notifications" className="focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <NotificationSettingsManager />
          </TabsContent>

          <TabsContent value="blocked" className="focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <BlockedTimesManager />
          </TabsContent>

          <TabsContent value="status" className="focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <StatusColorManager />
          </TabsContent>

          <TabsContent value="cardsize" className="focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardSizeManager />
          </TabsContent>

          <TabsContent value="presets" className="focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CalendarViewPresets />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
