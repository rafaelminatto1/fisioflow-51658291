import { useAppointments } from '@/hooks/useAppointments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppointmentHistoryProps {
  patientId: string;
  limit?: number;
}

export function AppointmentHistory({ patientId, limit = 10 }: AppointmentHistoryProps) {
  const { data: appointments = [], isLoading } = useAppointments();

  const patientAppointments = appointments
    .filter((apt) => apt.patientId === patientId)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando histórico...</div>;
  }

  if (patientAppointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Agendamentos</CardTitle>
          <CardDescription>Nenhum agendamento encontrado</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'agendado': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'cancelado': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'em_atendimento': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'agendado': 'Agendado',
      'em_atendimento': 'Em Atendimento',
      'concluido': 'Concluído',
      'cancelado': 'Cancelado',
      'falta': 'Faltou',
    };
    return labels[status] || status;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Agendamentos</CardTitle>
        <CardDescription>Últimos {limit} agendamentos do paciente</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {patientAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {format(apt.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{apt.time}</span>
                    <span>•</span>
                    <span>{apt.duration} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{apt.type}</span>
                  </div>
                  {apt.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{apt.notes}</p>
                  )}
                </div>
                <Badge className={getStatusColor(apt.status)} variant="secondary">
                  {getStatusLabel(apt.status)}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
