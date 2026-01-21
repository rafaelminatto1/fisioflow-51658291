import { MainLayout } from '@/components/layout/MainLayout';
import { ScheduleCapacityManager } from '@/components/schedule/ScheduleCapacityManager';
import { BusinessHoursManager } from '@/components/schedule/settings/BusinessHoursManager';
import { CancellationRulesManager } from '@/components/schedule/settings/CancellationRulesManager';
import { NotificationSettingsManager } from '@/components/schedule/settings/NotificationSettingsManager';
import { BlockedTimesManager } from '@/components/schedule/settings/BlockedTimesManager';
import { StatusColorManager } from '@/components/schedule/settings/StatusColorManager';
import { StatusColorSettingsModal } from '@/components/schedule/settings/StatusColorSettingsModal';
import { CardSizeManager } from '@/components/schedule/settings/CardSizeManager';
import { CalendarViewPresets } from '@/components/schedule/settings/CalendarViewPresets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { Settings, Clock, Users, Bell, AlertTriangle, CalendarOff, Palette, Frame, ArrowLeft, Info, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/shared/ui/button';

export default function ScheduleSettings() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="flex items-center gap-4 pb-2">
          <Link to="/schedule">
            <Button variant="ghost" size="icon" className="rounded-lg">
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
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
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

        <Tabs defaultValue="capacity" className="space-y-6">
          {/* Enhanced Tabs List */}
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-8 h-auto gap-2 bg-muted/50 p-2 rounded-xl border border-border/50 shadow-sm">
            <TabsTrigger
              value="capacity"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all data-[state=active]:border-border data-[state=active]:border"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Capacidade</span>
            </TabsTrigger>
            <TabsTrigger
              value="hours"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all data-[state=active]:border-border data-[state=active]:border"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Horários</span>
            </TabsTrigger>
            <TabsTrigger
              value="cancellation"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all data-[state=active]:border-border data-[state=active]:border"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Cancelamento</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all data-[state=active]:border-border data-[state=active]:border"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Notificações</span>
            </TabsTrigger>
            <TabsTrigger
              value="blocked"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all data-[state=active]:border-border data-[state=active]:border"
            >
              <CalendarOff className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Bloqueios</span>
            </TabsTrigger>
            <TabsTrigger
              value="status"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all data-[state=active]:border-border data-[state=active]:border"
            >
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Cores</span>
            </TabsTrigger>
            <TabsTrigger
              value="cardsize"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all data-[state=active]:border-border data-[state=active]:border"
            >
              <Frame className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Aparência</span>
            </TabsTrigger>
            <TabsTrigger
              value="presets"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all data-[state=active]:border-border data-[state=active]:border"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Presets</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="capacity" className="focus-visible:outline-none focus-visible:ring-0">
            <ScheduleCapacityManager />
          </TabsContent>

          <TabsContent value="hours" className="focus-visible:outline-none focus-visible:ring-0">
            <BusinessHoursManager />
          </TabsContent>

          <TabsContent value="cancellation" className="focus-visible:outline-none focus-visible:ring-0">
            <CancellationRulesManager />
          </TabsContent>

          <TabsContent value="notifications" className="focus-visible:outline-none focus-visible:ring-0">
            <NotificationSettingsManager />
          </TabsContent>

          <TabsContent value="blocked" className="focus-visible:outline-none focus-visible:ring-0">
            <BlockedTimesManager />
          </TabsContent>

          <TabsContent value="status" className="focus-visible:outline-none focus-visible:ring-0">
            <StatusColorManager />
          </TabsContent>

          <TabsContent value="cardsize" className="focus-visible:outline-none focus-visible:ring-0">
            <CardSizeManager />
          </TabsContent>

          <TabsContent value="presets" className="focus-visible:outline-none focus-visible:ring-0">
            <CalendarViewPresets />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
