import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, Phone } from 'lucide-react';
import { useData } from '@/hooks/useData';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppointmentHelpers } from '@/types';

export function UpcomingAppointments() {
  const { appointments } = useData();

  // Get upcoming appointments (next 5, sorted by date and time)
  const upcomingAppointments = appointments
    .filter(apt => {
      const d = typeof apt.date === 'string'
        ? (() => {
          const [y, m, d] = apt.date.split('-').map(Number);
          return new Date(y, m - 1, d, 12, 0, 0);
        })()
        : apt.date;
      return d >= new Date();
    })
    .sort((a, b) => {
      const da = typeof a.date === 'string'
        ? (() => {
          const [y, m, d] = a.date.split('-').map(Number);
          return new Date(y, m - 1, d, 12, 0, 0);
        })()
        : a.date;
      const db = typeof b.date === 'string'
        ? (() => {
          const [y, m, d] = b.date.split('-').map(Number);
          return new Date(y, m - 1, d, 12, 0, 0);
        })()
        : b.date;
      const dateCompare = da.getTime() - db.getTime();
      if (dateCompare === 0) {
        return a.time.localeCompare(b.time);
      }
      return dateCompare;
    })
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmado':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'Pendente':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'Reagendado':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'Cancelado':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatAppointmentDate = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, 'dd/MM', { locale: ptBR });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Calendar className="w-5 h-5" />
          Próximos Agendamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingAppointments.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">Nenhum agendamento próximo</p>
          </div>
        ) : (
          upcomingAppointments.map((appointment) => (
            <div key={appointment.id} className="flex items-center justify-between p-3 bg-gradient-card rounded-lg border border-border hover:shadow-card transition-all">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{AppointmentHelpers.getPatientName(appointment)}</p>
                  <p className="text-sm text-muted-foreground">{appointment.type}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-xs ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatAppointmentDate(typeof appointment.date === 'string'
                        ? (() => {
                          const [y, m, d] = appointment.date.split('-').map(Number);
                          return new Date(y, m - 1, d, 12, 0, 0);
                        })()
                        : appointment.date)} - {appointment.time}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Phone className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}