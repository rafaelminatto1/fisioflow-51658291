import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Edit, Trash2, Clock, X, Bell, Users, UserPlus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from '@/hooks/use-mobile';
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
import type { Appointment } from '@/types/appointment';

import { STATUS_CONFIG } from '@/lib/config/agenda';

interface AppointmentQuickViewProps {
  appointment: Appointment;
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AppointmentQuickView: React.FC<AppointmentQuickViewProps> = ({
  appointment,
  children,
  onEdit,
  onDelete,
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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

  // Content component shared between Popover and Dialog
  const Content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-muted/50 to-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <span className="font-semibold text-base">
              {appointment.time} - {endTime}
            </span>
            <p className="text-sm text-muted-foreground font-medium">({appointment.duration || 60} min)</p>
          </div>
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 touch-target hover:bg-muted"
            onClick={() => onOpenChange?.(false)}
            aria-label="Fechar detalhes"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
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
          <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
            {interestCount} paciente{interestCount !== 1 ? 's' : ''} interessado{interestCount !== 1 ? 's' : ''}
          </span>
          <Bell className="h-3 w-3 text-amber-600 ml-auto" aria-hidden="true" />
        </div>
      )}

      {/* Content */}
      <div className="p-5 space-y-4 flex-1 overflow-y-auto">
        {/* Fisioterapeuta - placeholder */}
        <div className="flex items-start gap-3">
          <span className="text-base font-medium text-muted-foreground min-w-[110px]">Fisioterapeuta:</span>
          <span className="text-base font-semibold text-foreground">Activity Fisioterapia</span>
        </div>

        {/* Paciente */}
        <div className="flex items-start gap-3">
          <span className="text-base font-medium text-muted-foreground min-w-[110px]">Paciente:</span>
          <span className="text-base font-bold text-primary">{appointment.patientName}</span>
        </div>

        {/* Celular */}
        <div className="flex items-start gap-3">
          <span className="text-base font-medium text-muted-foreground min-w-[110px]">Celular:</span>
          <span className="text-base font-medium text-foreground">{appointment.phone || 'Não informado'}</span>
        </div>

        {/* Convênio */}
        <div className="flex items-start gap-3">
          <span className="text-base font-medium text-muted-foreground min-w-[110px]">Convênio:</span>
          <span className="text-base font-medium text-foreground">{appointment.type || 'Particular'}</span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-base font-medium text-muted-foreground min-w-[110px]">Status:</span>
          <Select
            value={appointment.status}
            onValueChange={handleStatusChange}
            disabled={isUpdatingStatus}
            aria-label="Mudar status do agendamento"
          >
            <SelectTrigger className="h-10 w-[180px]" aria-label={`Status atual: ${STATUS_CONFIG[appointment.status]?.label}`}>
              <SelectValue>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_CONFIG[appointment.status]?.color }} aria-hidden="true" />
                  <span className="text-sm">{STATUS_CONFIG[appointment.status]?.label}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG)
                .filter(([key]) => [
                  'agendado',
                  'confirmado',
                  'em_andamento',
                  'realizado',
                  'cancelado',
                  'falta',
                  'remarcado',
                  'aguardando_confirmacao',
                  'em_espera',
                  'avaliacao'
                ].includes(key))
                .map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} aria-hidden="true" />
                      <span>{config.label}</span>
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
        </div>

        {/* Add to Waitlist Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-9 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 touch-target font-medium"
          onClick={() => {
            setShowWaitlistQuickAdd(true);
            onOpenChange?.(false);
          }}
          aria-label="Adicionar outro paciente à lista de espera para este horário"
        >
          <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
          Outro paciente quer este horário?
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        // Mobile: use Drawer (Bottom Sheet)
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerTrigger asChild>
            <span
              className="contents"
              onClick={(e) => {
                // Prevent opening if a drag might be happening
                e.stopPropagation();
                onOpenChange?.(true);
              }}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={`Ver detalhes do agendamento de ${appointment.patientName}`}
            >
              {children}
            </span>
          </DrawerTrigger>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="text-left border-b pb-4 hidden">
              <DrawerTitle>Detalhes do Agendamento</DrawerTitle>
              <DrawerDescription>Visualizar e editar detalhes do agendamento</DrawerDescription>
            </DrawerHeader>
            {/* Wrap Content in a div that handles the layout structure for Drawer */}
            <div className="pb-6 animate-in slide-in-from-bottom-4 duration-300">
              {Content}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        // Desktop: use Popover (side panel)
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            {children}
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0 bg-card border border-border shadow-xl z-50"
            align="start"
            side="right"
            sideOffset={8}
            collisionPadding={16}
            role="dialog"
            aria-modal="false"
            aria-label={`Detalhes do agendamento de ${appointment.patientName}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={open ? 'open' : 'closed'}
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{
                  duration: 0.2,
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                {Content}
              </motion.div>
            </AnimatePresence>
          </PopoverContent>
        </Popover>
      )}

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
