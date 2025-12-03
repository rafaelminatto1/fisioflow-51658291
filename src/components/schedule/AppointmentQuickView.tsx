import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Play, Edit, Trash2, Clock, User, Phone, CreditCard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import { cn } from '@/lib/utils';

interface AppointmentQuickViewProps {
  appointment: Appointment;
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const statusLabels: Record<AppointmentStatus, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  falta: 'Falta',
};

const statusColors: Record<AppointmentStatus, string> = {
  agendado: 'bg-blue-500',
  confirmado: 'bg-green-500',
  em_andamento: 'bg-yellow-500',
  concluido: 'bg-gray-500',
  cancelado: 'bg-red-500',
  falta: 'bg-orange-500',
};

export const AppointmentQuickView: React.FC<AppointmentQuickViewProps> = ({
  appointment,
  children,
  onEdit,
  onDelete,
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { confirmAppointment, cancelAppointment, isConfirming, isCanceling } = useAppointmentActions();

  const canStartAttendance = appointment.status === 'confirmado' || appointment.status === 'agendado';

  const handleStartAttendance = () => {
    navigate(`/patient-evolution/${appointment.id}`);
    toast.success('Iniciando atendimento', {
      description: `Atendimento de ${appointment.patientName}`,
    });
    onOpenChange?.(false);
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'confirmado') {
      confirmAppointment(appointment.id);
    } else if (newStatus === 'cancelado') {
      cancelAppointment(appointment.id);
    }
  };

  const handleEdit = () => {
    onEdit?.();
    onOpenChange?.(false);
  };

  const handleDelete = () => {
    onDelete?.();
    onOpenChange?.(false);
  };

  const appointmentDate = typeof appointment.date === 'string' 
    ? new Date(appointment.date) 
    : appointment.date;

  // Calculate end time
  const startHour = parseInt(appointment.time.split(':')[0]);
  const startMinute = parseInt(appointment.time.split(':')[1]);
  const endMinutes = startHour * 60 + startMinute + (appointment.duration || 60);
  const endHour = Math.floor(endMinutes / 60);
  const endMinute = endMinutes % 60;
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 bg-card border border-border shadow-xl z-50" 
        align="start"
        side="right"
        sideOffset={5}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">
              Horário: {appointment.time} - {endTime}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => onOpenChange?.(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Fisioterapeuta - placeholder */}
          <div className="flex items-start gap-2">
            <span className="text-sm text-muted-foreground min-w-[90px]">Fisioterapeuta:</span>
            <span className="text-sm font-medium text-primary">Activity Fisioterapia</span>
          </div>

          {/* Paciente */}
          <div className="flex items-start gap-2">
            <span className="text-sm text-muted-foreground min-w-[90px]">Paciente:</span>
            <span className="text-sm font-medium text-primary">{appointment.patientName}</span>
          </div>

          {/* Celular */}
          <div className="flex items-start gap-2">
            <span className="text-sm text-muted-foreground min-w-[90px]">Celular:</span>
            <span className="text-sm">{appointment.phone || 'Não informado'}</span>
          </div>

          {/* Convênio */}
          <div className="flex items-start gap-2">
            <span className="text-sm text-muted-foreground min-w-[90px]">Convênio:</span>
            <span className="text-sm">{appointment.type || 'Particular'}</span>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground min-w-[90px]">Status:</span>
            <Select
              value={appointment.status}
              onValueChange={handleStatusChange}
              disabled={isConfirming || isCanceling}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", statusColors[appointment.status])} />
                    <span>{statusLabels[appointment.status]}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", statusColors[value as AppointmentStatus])} />
                      <span>{label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="p-3 flex items-center gap-2">
          {canStartAttendance && (
            <Button 
              onClick={handleStartAttendance}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              <Play className="h-4 w-4 mr-1" />
              Iniciar atendimento
            </Button>
          )}
          
          {onEdit && (
            <Button 
              variant="outline" 
              size="icon"
              className="h-8 w-8"
              onClick={handleEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          
          {onDelete && (
            <Button 
              variant="outline" 
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
