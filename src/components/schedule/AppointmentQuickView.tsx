import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Edit, Trash2, Clock, X, Bell, Users, UserPlus, FileText, CalendarClock, CheckCircle2, AlertCircle, Package } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import { useWaitlistMatch } from '@/hooks/useWaitlistMatch';
import { usePatientPackages } from '@/hooks/usePackages';
import { useTherapists, formatTherapistLabel, getTherapistById, THERAPIST_SELECT_NONE } from '@/hooks/useTherapists';
import { useUpdateAppointment } from '@/hooks/useAppointments';
import { WaitlistNotification } from './WaitlistNotification';
import { WaitlistQuickAdd } from './WaitlistQuickAdd';
import type { Appointment } from '@/types/appointment';
import { formatCurrency } from '@/lib/utils';

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
  const { data: patientPackages = [] } = usePatientPackages(appointment.patientId);
  const { therapists = [] } = useTherapists();
  const { mutateAsync: updateAppointment } = useUpdateAppointment();
  const [showWaitlistNotification, setShowWaitlistNotification] = useState(false);
  const [showWaitlistQuickAdd, setShowWaitlistQuickAdd] = useState(false);
  // Local state for optimistic updates - syncs with appointment
  const [localStatus, setLocalStatus] = useState(appointment.status);
  const [localPaymentStatus, setLocalPaymentStatus] = useState(() =>
    ((appointment.payment_status ?? 'pending') as string).toLowerCase()
  );
  const [localTherapistId, setLocalTherapistId] = useState(appointment.therapistId ?? '');

  // Pacote vinculado a este agendamento (session_package_id = id do patient_packages)
  const linkedPackage = useMemo(() => {
    if (!appointment.session_package_id) return null;
    return patientPackages.find((p) => p.id === appointment.session_package_id) ?? null;
  }, [patientPackages, appointment.session_package_id]);

  const sessionNumber = linkedPackage ? linkedPackage.sessions_used + 1 : null;
  const sessionTotal = linkedPackage ? linkedPackage.sessions_purchased : null;
  const paymentAmount = appointment.payment_amount != null ? Number(appointment.payment_amount) : null;
  const isPaid = localPaymentStatus === 'paid' || localPaymentStatus === 'pago';

  // Sync local state when appointment prop changes
  useEffect(() => {
    setLocalStatus(appointment.status);
    setLocalPaymentStatus(((appointment.payment_status ?? 'pending') as string).toLowerCase());
    setLocalTherapistId(appointment.therapistId ?? '');
  }, [appointment.status, appointment.payment_status, appointment.therapistId]);

  const appointmentDate = useMemo((): Date => {
    const d = appointment.date as Date | string | null | undefined;
    if (d instanceof Date && !isNaN(d.getTime())) return d;
    if (typeof d === 'string' && String(d).trim()) {
      const parts = String(d).split('-').map(Number);
      if (parts.length === 3) {
        const [y, m, day] = parts;
        const parsed = new Date(y, m - 1, day, 12, 0, 0);
        if (Number.isFinite(parsed.getTime())) return parsed;
      }
    }
    return new Date();
  }, [appointment.date]);

  const interestCount = getInterestCount(appointmentDate, appointment.time);
  const hasWaitlistInterest = interestCount > 0;

  const canStartAttendance = true;

  const handleStartAttendance = () => {
    if (localStatus === 'avaliacao') {
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
      // Optimistic update - update local state immediately
      setLocalStatus(newStatus as any);
      // Then call the API
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

  const handleTherapistChange = async (therapistId: string) => {
    if (therapistId === localTherapistId) return;
    setLocalTherapistId(therapistId);
    try {
      await updateAppointment({
        appointmentId: appointment.id,
        updates: { therapist_id: therapistId || null },
      });
    } catch {
      setLocalTherapistId(appointment.therapistId ?? '');
    }
  };

  const handlePaymentStatusChange = async (value: string) => {
    const newStatus = value === 'paid' ? 'paid' : 'pending';
    if (newStatus === localPaymentStatus) return;
    setLocalPaymentStatus(newStatus);
    try {
      await updateAppointment({
        appointmentId: appointment.id,
        updates: { payment_status: newStatus },
      });
    } catch {
      setLocalPaymentStatus(((appointment.payment_status ?? 'pending') as string).toLowerCase());
    }
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
    <div className="flex flex-col h-full min-w-0 max-w-full overflow-hidden">
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
      <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
        {/* Quem: Fisioterapeuta (editável) + Paciente */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-base font-medium text-muted-foreground min-w-[110px] shrink-0">Fisioterapeuta:</span>
            <Select
              value={localTherapistId || THERAPIST_SELECT_NONE}
              onValueChange={(v) => handleTherapistChange(v === THERAPIST_SELECT_NONE ? '' : v)}
              aria-label="Alterar fisioterapeuta"
            >
              <SelectTrigger className="h-9 flex-1 min-w-0 max-w-[180px]" aria-label="Fisioterapeuta do agendamento">
                <SelectValue placeholder="Escolher fisioterapeuta">
                  {getTherapistById(therapists, localTherapistId)?.name ?? 'Activity Fisioterapia'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={THERAPIST_SELECT_NONE}>Activity Fisioterapia</SelectItem>
                {therapists.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {formatTherapistLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-base font-medium text-muted-foreground min-w-[110px]">Paciente:</span>
            <span className="text-base font-bold text-primary">{appointment.patientName}</span>
          </div>
        </div>

        {/* Pagamento: status (editável) + valor na mesma linha */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-medium text-muted-foreground shrink-0">Pagamento:</span>
          <Select
            value={isPaid ? 'paid' : 'pending'}
            onValueChange={handlePaymentStatusChange}
            aria-label="Alterar status de pagamento"
          >
            <SelectTrigger className="h-9 w-auto min-w-[120px] max-w-[140px]" aria-label="Status de pagamento">
              <SelectValue>
                {isPaid ? (
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Pago
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                    Pendente
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                  Pago
                </span>
              </SelectItem>
              <SelectItem value="pending">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                  Pendente
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          {paymentAmount != null && paymentAmount > 0 && (
            <span className="text-sm font-medium text-foreground" aria-label={`Valor: ${formatCurrency(paymentAmount)}`}>
              {formatCurrency(paymentAmount)}
            </span>
          )}
        </div>

        {/* Pacote: Sessão X de Y (quando vinculado) */}
        {linkedPackage != null && sessionNumber != null && sessionTotal != null && sessionTotal > 0 && (
          <div className="space-y-2">
            <span className="text-base font-medium text-muted-foreground block">Pacote:</span>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1.5 font-medium">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  Sessão {sessionNumber} de {sessionTotal}
                </Badge>
              </div>
              <Progress
                value={(sessionNumber / sessionTotal) * 100}
                className="h-1.5 w-full"
              />
            </div>
          </div>
        )}

        {/* Status do agendamento */}
        <div className="flex items-center gap-4 pt-1">
          <span className="text-base font-medium text-muted-foreground min-w-[110px]">Status:</span>
          <Select
            value={localStatus}
            onValueChange={handleStatusChange}
            disabled={isUpdatingStatus}
            aria-label="Mudar status do agendamento"
          >
            <SelectTrigger className="h-10 w-[180px]" aria-label={`Status atual: ${STATUS_CONFIG[localStatus]?.label}`}>
              <SelectValue>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_CONFIG[localStatus]?.color }} aria-hidden="true" />
                  <span className="text-sm">{STATUS_CONFIG[localStatus]?.label}</span>
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
      <div className="p-4 space-y-3 bg-muted/20">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {onEdit && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 touch-target bg-background shrink-0"
                onClick={handleEdit}
                aria-label="Editar agendamento"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="touch-target bg-background shrink-0 h-9 px-2 sm:px-3"
                onClick={handleEdit}
                aria-label="Reagendar: mudar data e horário"
              >
                <CalendarClock className="h-4 w-4 sm:mr-1.5 shrink-0" aria-hidden />
                <span className="hidden sm:inline">Reagendar</span>
              </Button>
            </>
          )}

          {onDelete && (
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 touch-target bg-background shrink-0"
              onClick={handleDelete}
              aria-label="Excluir agendamento"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {canStartAttendance && (
          <Button
            onClick={handleStartAttendance}
            className="w-full min-w-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            size="sm"
            aria-label={localStatus === 'avaliacao' ? 'Iniciar avaliação' : 'Iniciar atendimento'}
          >
            <span className="flex items-center gap-1.5 truncate">
              {localStatus === 'avaliacao' ? (
                <FileText className="h-4 w-4 shrink-0" />
              ) : (
                <Play className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">{localStatus === 'avaliacao' ? 'Iniciar Avaliação' : 'Iniciar atendimento'}</span>
            </span>
          </Button>
        )}

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
            className="w-80 max-w-sm p-0 bg-card border border-border shadow-xl z-50"
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
