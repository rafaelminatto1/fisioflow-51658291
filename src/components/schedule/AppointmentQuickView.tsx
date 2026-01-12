import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Play, Edit, Trash2, Clock, User, Phone, CreditCard, X, Bell, Users, UserPlus, FileText } from 'lucide-react';
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
import { useWaitlistMatch } from '@/hooks/useWaitlistMatch';
import { WaitlistNotification } from './WaitlistNotification';
import { WaitlistQuickAdd } from './WaitlistQuickAdd';
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
  avaliacao: 'Avaliação',
  confirmado: 'Confirmado',
  aguardando_confirmacao: 'Aguardando',
  em_andamento: 'Em Andamento',
  em_espera: 'Em Espera',
  atrasado: 'Atrasado',
  concluido: 'Concluído',
  remarcado: 'Remarcado',
  cancelado: 'Cancelado',
  falta: 'Falta',
};

const statusColors: Record<AppointmentStatus, string> = {
  agendado: 'bg-blue-500',
  avaliacao: 'bg-violet-500',
  confirmado: 'bg-emerald-500',
  aguardando_confirmacao: 'bg-amber-500',
  em_andamento: 'bg-yellow-500',
  em_espera: 'bg-indigo-500',
  atrasado: 'bg-yellow-500',
  concluido: 'bg-purple-500',
  remarcado: 'bg-orange-500',
  cancelado: 'bg-red-500',
  falta: 'bg-rose-500',
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
  const { updateStatus, isUpdatingStatus } = useAppointmentActions();
  const { getInterestCount, hasInterest } = useWaitlistMatch();
  const [showWaitlistNotification, setShowWaitlistNotification] = useState(false);
  const [showWaitlistQuickAdd, setShowWaitlistQuickAdd] = useState(false);

  const appointmentDate = typeof appointment.date === 'string'
    ? (() => {
      const [y, m, d] = appointment.date.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0); // Local noon
    })()
    : appointment.date;

  const interestCount = getInterestCount(appointmentDate, appointment.time);
  const hasWaitlistInterest = interestCount > 0;

  const canStartAttendance = appointment.status === 'confirmado' || appointment.status === 'agendado' || appointment.status === 'avaliacao';

  const handleStartAttendance = () => {
    if (appointment.status === 'avaliacao') {
      navigate(`/patients/${appointment.patientId}/evaluations/new?appointmentId=${appointment.id}`);
      toast.success('Iniciando avaliação', {
        description: `Avaliação de ${appointment.patientName}`,
      });
    } else {
      navigate(`/patient-evolution/${appointment.id}`);
      toast.success('Iniciando atendimento', {
        description: `Atendimento de ${appointment.patientName}`,
      });
    }
    onOpenChange?.(false);
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus !== appointment.status) {
      updateStatus({ appointmentId: appointment.id, status: newStatus });

      // If cancelling and there are interested patients, show notification
      if ((newStatus === 'cancelado' || newStatus === 'falta') && hasWaitlistInterest) {
        setTimeout(() => {
          setShowWaitlistNotification(true);
        }, 500);
      }
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

  // Calculate end time
  // Safety check for time
  const time = appointment.time || '00:00';
  const startHour = parseInt(time.split(':')[0]);
  const startMinute = parseInt(time.split(':')[1]);
  const endMinutes = startHour * 60 + startMinute + (appointment.duration || 60);
  const endHour = Math.floor(endMinutes / 60);
  const endMinute = endMinutes % 60;
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

  return (
    <>
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

          {/* Waitlist Interest Alert */}
          {hasWaitlistInterest && (
            <div
              className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors"
              onClick={() => setShowWaitlistNotification(true)}
            >
              <Users className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-amber-700 dark:text-amber-400">
                {interestCount} paciente{interestCount !== 1 ? 's' : ''} interessado{interestCount !== 1 ? 's' : ''} neste horário
              </span>
              <Bell className="h-3 w-3 text-amber-600 ml-auto" />
            </div>
          )}

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
                disabled={isUpdatingStatus}
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
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              {canStartAttendance && (
                <Button
                  onClick={handleStartAttendance}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                >
                  <span className="flex items-center gap-1.5">
                    {appointment.status === 'avaliacao' ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {appointment.status === 'avaliacao' ? 'Iniciar Avaliação' : 'Iniciar atendimento'}
                  </span>
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

            {/* Add to Waitlist Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setShowWaitlistQuickAdd(true);
                onOpenChange?.(false);
              }}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Outro paciente quer este horário?
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Waitlist Notification Modal */}
      <WaitlistNotification
        open={showWaitlistNotification}
        onOpenChange={setShowWaitlistNotification}
        date={appointmentDate}
        time={appointment.time}
      />

      {/* Waitlist Quick Add Modal */}
      <WaitlistQuickAdd
        open={showWaitlistQuickAdd}
        onOpenChange={setShowWaitlistQuickAdd}
        date={appointmentDate}
        time={appointment.time}
      />
    </>
  );
};