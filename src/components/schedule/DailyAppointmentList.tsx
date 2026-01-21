import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { cn } from '@/lib/utils';
import { Clock, User, Phone, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { Appointment } from '@/types/appointment';

interface DailyAppointmentListProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}

export function DailyAppointmentList({ appointments, onAppointmentClick }: DailyAppointmentListProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return { 
          icon: CheckCircle, 
          label: 'Confirmado', 
          className: 'bg-success/10 text-success border-success/20',
          iconColor: 'text-success'
        };
      case 'Pending':
        return { 
          icon: AlertCircle, 
          label: 'Pendente', 
          className: 'bg-warning/10 text-warning border-warning/20',
          iconColor: 'text-warning'
        };
      case 'Cancelled':
        return { 
          icon: XCircle, 
          label: 'Cancelado', 
          className: 'bg-destructive/10 text-destructive border-destructive/20',
          iconColor: 'text-destructive'
        };
      case 'Completed':
        return { 
          icon: CheckCircle, 
          label: 'Concluído', 
          className: 'bg-primary/10 text-primary border-primary/20',
          iconColor: 'text-primary'
        };
      default:
        return { 
          icon: AlertCircle, 
          label: status, 
          className: 'bg-muted text-muted-foreground border-border',
          iconColor: 'text-muted-foreground'
        };
    }
  };

  if (appointments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            Nenhum agendamento para este dia
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => {
        const statusConfig = getStatusConfig(appointment.status);
        const StatusIcon = statusConfig.icon;
        
        return (
          <Card 
            key={appointment.id}
            className="group hover:shadow-hover transition-all duration-300 cursor-pointer hover-lift border-l-4"
            style={{ borderLeftColor: `hsl(var(--${appointment.status.toLowerCase()}))` }}
            onClick={() => onAppointmentClick(appointment)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                {/* Horário e Status */}
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn(
                    "p-2.5 rounded-xl transition-all duration-300",
                    "bg-gradient-primary shadow-medical group-hover:scale-110"
                  )}>
                    <Clock className="w-5 h-5 text-primary-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Horário */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">
                        {appointment.time}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs font-medium", statusConfig.className)}
                      >
                        <StatusIcon className={cn("w-3 h-3 mr-1", statusConfig.iconColor)} />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    
                    {/* Paciente */}
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium truncate">
                        {appointment.patientName}
                      </span>
                    </div>
                    
                    {/* Tipo de Consulta */}
                    <Badge variant="secondary" className="text-xs">
                      {appointment.type}
                    </Badge>
                    
                    {/* Telefone (se disponível) */}
                    {appointment.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <Phone className="w-3 h-3" />
                        <span>{appointment.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão de Ação */}
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="hover:bg-primary/10 hover:text-primary shrink-0"
                >
                  Ver
                </Button>
              </div>
              
              {/* Notas (se disponível) */}
              {appointment.notes && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {appointment.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
