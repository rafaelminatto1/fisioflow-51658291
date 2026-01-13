import React, { useState } from 'react';
import { Play, Edit, Trash2, Clock, X, Bell, Users, UserPlus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const { getInterestCount } = useWaitlistMatch();
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

  const canStartAttendance = true;

  const handleStartAttendance = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ae75a3a7-6143-4496-8bed-b84b16af833f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/components/schedule/AppointmentQuickView.tsx:89',message:'handleStartAttendance called',data:{appointmentId:appointment.id,patientId:appointment.patientId,patientName:appointment.patientName,status:appointment.status,targetUrl:appointment.status==='avaliacao'?`/patients/${appointment.patientId}/evaluations/new?appointmentId=${appointment.id}`:`/patient-evolution/${appointment.id}`},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion

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
  // Safety check for time - handle null, undefined, or empty string
  const time = appointment.time && appointment.time.trim() ? appointment.time : '00:00';
  const startHour = parseInt(time.split(':')[0] || '0');
  const startMinute = parseInt(time.split(':')[1] || '0');
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
          className="w-80 p-0 bg-card border border-border shadow-xl z-50 animate-fade-in"
          align="start"
          side="right"
          sideOffset={8}
          role="dialog"
          aria-modal="false"
          aria-label={`Detalhes do agendamento de ${appointment.patientName}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-border bg-gradient-to-r from-muted/50 to-muted/30">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <div>
                <span className="font-semibold text-sm">
                  {appointment.time} - {endTime}
                </span>
                <p className="text-xs text-muted-foreground">({appointment.duration || 60} min)</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 touch-target hover:bg-muted"
              onClick={() => onOpenChange?.(false)}
              aria-label="Fechar detalhes"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Waitlist Interest Alert */}
          {hasWaitlistInterest && (
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors"
              onClick={() => setShowWaitlistNotification(true)}
              role="button"
              tabIndex={0}
              aria-label={`${interestCount} paciente${interestCount !== 1 ? 's' : ''} interessado${interestCount !== 1 ? 's' : ''} neste horário. Clique para ver detalhes.`}
            >
              <Users className="h-4 w-4 text-amber-600" aria-hidden="true" />
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                {interestCount} paciente{interestCount !== 1 ? 's' : ''} interessado{interestCount !== 1 ? 's' : ''}
              </span>
              <Bell className="h-3 w-3 text-amber-600 ml-auto" aria-hidden="true" />
            </div>
          )}

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Fisioterapeuta - placeholder */}
            <div className="flex items-start gap-3">
              <span className="text-sm text-muted-foreground min-w-[100px]">Fisioterapeuta:</span>
              <span className="text-sm font-medium text-foreground">Activity Fisioterapia</span>
            </div>

            {/* Paciente */}
            <div className="flex items-start gap-3">
              <span className="text-sm text-muted-foreground min-w-[100px]">Paciente:</span>
              <span className="text-sm font-semibold text-primary">{appointment.patientName}</span>
            </div>

            {/* Celular */}
            <div className="flex items-start gap-3">
              <span className="text-sm text-muted-foreground min-w-[100px]">Celular:</span>
              <span className="text-sm text-foreground">{appointment.phone || 'Não informado'}</span>
            </div>

            {/* Convênio */}
            <div className="flex items-start gap-3">
              <span className="text-sm text-muted-foreground min-w-[100px]">Convênio:</span>
              <span className="text-sm text-foreground">{appointment.type || 'Particular'}</span>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-sm text-muted-foreground min-w-[100px]">Status:</span>
              <Select
                value={appointment.status}
                onValueChange={handleStatusChange}
                disabled={isUpdatingStatus}
                aria-label="Mudar status do agendamento"
              >
                <SelectTrigger className="h-9 w-[155px]" aria-label={`Status atual: ${statusLabels[appointment.status]}`}>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full", statusColors[appointment.status])} aria-hidden="true" />
                      <span className="text-xs">{statusLabels[appointment.status]}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", statusColors[value as AppointmentStatus])} aria-hidden="true" />
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
          <div className="p-3.5 space-y-2.5 bg-muted/20">
            <div className="flex items-center gap-2">
              {canStartAttendance && (
                <Button
                  onClick={handleStartAttendance}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  size="sm"
                  aria-label={appointment.status === 'avaliacao' ? 'Iniciar avaliação' : 'Iniciar atendimento'}
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
                  className="h-9 w-9 touch-target bg-background"
                  onClick={handleEdit}
                  aria-label="Editar agendamento"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}

              {onDelete && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 touch-target bg-background"
                  onClick={handleDelete}
                  aria-label="Excluir agendamento"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Add to Waitlist Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 touch-target"
              onClick={() => {
                setShowWaitlistQuickAdd(true);
                onOpenChange?.(false);
              }}
              aria-label="Adicionar outro paciente à lista de espera para este horário"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
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
        time={time}
      />

      {/* Waitlist Quick Add Modal */}
      <WaitlistQuickAdd
        open={showWaitlistQuickAdd}
        onOpenChange={setShowWaitlistQuickAdd}
        date={appointmentDate}
        time={time}
      />
    </>
  );
};