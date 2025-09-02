import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, MapPin, Phone, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  patient_name: string;
  appointment_time: string;
  appointment_date: string;
  status: string;
  type?: string;
  room?: string;
  patient_phone?: string;
  patient_avatar?: string;
}

interface AppointmentWidgetProps {
  appointments: Appointment[];
  title: string;
  loading?: boolean;
  showActions?: boolean;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export function AppointmentWidget({
  appointments,
  title,
  loading = false,
  showActions = false,
  onConfirm,
  onCancel,
  onViewDetails
}: AppointmentWidgetProps) {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmado':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'cancelado':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'em andamento':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPatientInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'PA';
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-foreground flex items-center justify-between">
          {title}
          <Badge variant="outline" className="ml-2">
            {appointments.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum agendamento encontrado</p>
          </div>
        ) : (
          appointments.slice(0, 5).map((appointment) => (
            <div
              key={appointment.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onViewDetails?.(appointment.id)}
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={appointment.patient_avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getPatientInitials(appointment.patient_name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground truncate">
                    {appointment.patient_name}
                  </h4>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", getStatusColor(appointment.status))}
                  >
                    {appointment.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {appointment.appointment_time}
                  </div>
                  {appointment.room && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {appointment.room}
                    </div>
                  )}
                  {appointment.type && (
                    <span className="text-primary">{appointment.type}</span>
                  )}
                </div>

                {showActions && appointment.status === 'Pendente' && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfirm?.(appointment.id);
                      }}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancel?.(appointment.id);
                      }}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}