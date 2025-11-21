import { MainLayout } from '@/components/layout/MainLayout';
import { ScheduleCapacityManager } from '@/components/schedule/ScheduleCapacityManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

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

        <div className="grid gap-6">
          <ScheduleCapacityManager />

          <Card>
            <CardHeader>
              <CardTitle>Outras Configurações</CardTitle>
              <CardDescription>
                Configurações adicionais da agenda (em desenvolvimento)
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li>• Horários de funcionamento</li>
                <li>• Regras de cancelamento</li>
                <li>• Notificações automáticas</li>
                <li>• Bloqueio de horários</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
