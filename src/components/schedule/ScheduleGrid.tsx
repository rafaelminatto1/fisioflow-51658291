import React, { memo, useMemo } from 'react';
import { Calendar, Clock, User, Phone, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { AppointmentCardSkeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/errors/logger';
import type { Appointment } from '@/types/appointment';

interface ScheduleGridProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  showSkeleton?: boolean;
}

const ScheduleGridComponent: React.FC<ScheduleGridProps> = ({
  appointments,
  onAppointmentClick,
  showSkeleton = false
}) => {
  // Memoized status mapping for better performance
  const getStatusConfig = useMemo(() => {
    const statusMap = {
      scheduled: {
        label: 'Agendado',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Clock,
        bgColor: 'bg-blue-50'
      },
      confirmed: {
        label: 'Confirmado',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        bgColor: 'bg-green-50'
      },
      completed: {
        label: 'Concluído',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: CheckCircle,
        bgColor: 'bg-purple-50'
      },
      cancelled: {
        label: 'Cancelado',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        bgColor: 'bg-red-50'
      },
      'no-show': {
        label: 'Faltou',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertCircle,
        bgColor: 'bg-orange-50'
      }
    };
    return (status: string) => statusMap[status as keyof typeof statusMap] || statusMap.scheduled;
  }, []);

  // Memoized time formatting
  const formatTime = useMemo(() => {
    return (time: string) => {
      try {
        const [hours, minutes] = time.split(':');
        return `${hours}:${minutes}`;
      } catch {
        return time;
      }
    };
  }, []);

  // Memoized date formatting
  const formatDate = useMemo(() => {
    return (date: string | Date) => {
      try {
        const dateObj = date instanceof Date ? date : new Date(date);
        return dateObj.toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short'
        });
      } catch {
        return typeof date === 'string' ? date : date.toString();
      }
    };
  }, []);

  // Memoized AppointmentCard component
  const AppointmentCard = memo(({ appointment }: { appointment: Appointment }) => {
    try {
      const statusConfig = getStatusConfig(appointment.status);
      const StatusIcon = statusConfig.icon;

    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-0 shadow-md ${statusConfig.bgColor}`}
        onClick={() => onAppointmentClick(appointment)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white rounded-lg shadow-sm">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  {appointment.patientName}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-0.5">
                  {appointment.type}
                </p>
              </div>
            </div>
            <Badge className={`${statusConfig.color} border font-medium`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Date and Time */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(appointment.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{formatTime(appointment.time)}</span>
              </div>
            </div>

            {/* Contact Info */}
            {appointment.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{appointment.phone}</span>
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{appointment.notes}</span>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2 border-t border-gray-100">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-gray-700 hover:text-gray-900 hover:bg-white/50"
                onClick={(e) => {
                  e.stopPropagation();
                  onAppointmentClick(appointment);
                }}
              >
                Ver Detalhes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
    } catch (error) {
      logger.error('Erro ao renderizar AppointmentCard', { appointment, error }, 'ScheduleGrid');
      return (
        <Card className="cursor-pointer border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-center text-red-600">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Erro ao carregar agendamento</p>
              <p className="text-xs text-red-500 mt-1">ID: {appointment?.id || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
      );
    }
  });

  // Show skeleton during loading
  if (showSkeleton) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <AppointmentCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Empty state
  if (appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Calendar className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nenhum agendamento encontrado
        </h3>
        <p className="text-gray-600 mb-6">
          Não há agendamentos para os filtros selecionados.
        </p>
        <Button variant="outline" className="text-gray-600 border-gray-300">
          <Calendar className="h-4 w-4 mr-2" />
          Criar Novo Agendamento
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {appointments.map((appointment) => (
        <AppointmentCard key={appointment.id} appointment={appointment} />
      ))}
    </div>
  );
};

export const ScheduleGrid = memo(ScheduleGridComponent);
export default ScheduleGrid;