import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, Phone } from 'lucide-react';

const appointments = [
  {
    id: 1,
    patient: 'Carlos Mendes',
    time: '09:00',
    type: 'Consulta Inicial',
    status: 'Confirmado'
  },
  {
    id: 2,
    patient: 'Fernanda Oliveira',
    time: '10:30',
    type: 'Fisioterapia',
    status: 'Pendente'
  },
  {
    id: 3,
    patient: 'Roberto Silva',
    time: '14:00',
    type: 'Reavaliação',
    status: 'Confirmado'
  },
  {
    id: 4,
    patient: 'Lucia Santos',
    time: '15:30',
    type: 'Fisioterapia',
    status: 'Confirmado'
  },
];

export function UpcomingAppointments() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Calendar className="w-5 h-5" />
          Próximos Agendamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="flex items-center justify-between p-3 bg-gradient-card rounded-lg border border-border hover:shadow-card transition-all">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{appointment.patient}</p>
                <p className="text-sm text-muted-foreground">{appointment.type}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={appointment.status === 'Confirmado' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {appointment.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {appointment.time}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <Phone className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}