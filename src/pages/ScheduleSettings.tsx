import { MainLayout } from '@/components/layout/MainLayout';
import { ScheduleCapacityManager } from '@/components/schedule/ScheduleCapacityManager';
import { BusinessHoursManager } from '@/components/schedule/settings/BusinessHoursManager';
import { CancellationRulesManager } from '@/components/schedule/settings/CancellationRulesManager';
import { NotificationSettingsManager } from '@/components/schedule/settings/NotificationSettingsManager';
import { BlockedTimesManager } from '@/components/schedule/settings/BlockedTimesManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Clock, Users, Bell, AlertTriangle, CalendarOff } from 'lucide-react';

export default function ScheduleSettings() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Configurações da Agenda</h1>
            <p className="text-muted-foreground">
              Configure capacidade, horários e regras de agendamento
            </p>
          </div>
        </div>

        <Tabs defaultValue="capacity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-2 bg-transparent p-0">
            <TabsTrigger 
              value="capacity" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Capacidade</span>
            </TabsTrigger>
            <TabsTrigger 
              value="hours" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Horários</span>
            </TabsTrigger>
            <TabsTrigger 
              value="cancellation" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Cancelamento</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger 
              value="blocked" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
            >
              <CalendarOff className="h-4 w-4" />
              <span className="hidden sm:inline">Bloqueios</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="capacity">
            <ScheduleCapacityManager />
          </TabsContent>

          <TabsContent value="hours">
            <BusinessHoursManager />
          </TabsContent>

          <TabsContent value="cancellation">
            <CancellationRulesManager />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettingsManager />
          </TabsContent>

          <TabsContent value="blocked">
            <BlockedTimesManager />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}