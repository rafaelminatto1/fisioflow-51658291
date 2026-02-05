import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Play, Edit, Trash2, Clock, X, Bell, Users, UserPlus, FileText, CalendarClock, CheckCircle2, AlertCircle, Package, MessageCircle, MoreVertical, Timer, NotepadText, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
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
import { prefetchRoute, RouteKeys } from '@/lib/routing/routePrefetch';
import { useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '@/integrations/firebase/functions';
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
  const queryClient = useQueryClient();
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
      // Prefetch para página de avaliação
      prefetchRoute(
        () => import('../../pages/patients/NewEvaluationPage'),
        'evaluation-new'
      );

      navigate(`/patients/${appointment.patientId}/evaluations/new?appointmentId=${appointment.id}`);
      toast.success('Iniciando avaliação', {
        description: `Avaliação de ${appointment.patientName}`,
      });
    } else {
      // Prefetch do chunk da página de evolução (alto impacto)
      prefetchRoute(
        () => import('../../pages/PatientEvolution'),
        RouteKeys.PATIENT_EVOLUTION
      );

      // Prefetch dos dados críticos (appointment e paciente)
      queryClient.prefetchQuery({
        queryKey: ['appointment', appointment.id],
        queryFn: () => appointmentsApi.get(appointment.id),
        staleTime: 1000 * 60 * 2, // 2 minutos
      });

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
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/40 backdrop-blur-sm relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2.5 bg-primary/10 rounded-xl shadow-inner ring-1 ring-primary/20">
            <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-foreground">
                {appointment.time} — {endTime}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-bold uppercase tracking-widest">
              <Timer className="h-3 w-3" />
              {appointment.duration || 60} minutos
            </div>
          </div>
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted/80 relative z-10"
            onClick={() => onOpenChange?.(false)}
            aria-label="Fechar detalhes"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Waitlist Interest Alert */}
      {hasWaitlistInterest && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 cursor-pointer hover:bg-amber-500/15 transition-colors group"
          onClick={() => setShowWaitlistNotification(true)}
          role="button"
          tabIndex={0}
        >
          <div className="p-1.5 bg-amber-500/20 rounded-lg group-hover:scale-110 transition-transform">
            <Users className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-amber-800 dark:text-amber-400">
              {interestCount} interessado{interestCount !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px] text-amber-700/70 dark:text-amber-400/70 font-medium">
              Clique para gerenciar fila
            </span>
          </div>
          <Bell className="h-3.5 w-3.5 text-amber-600 ml-auto animate-pulse" aria-hidden="true" />
        </motion.div>
      )}

      {/* Content */}
      <div className="p-5 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        {/* Patient Block */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 truncate leading-tight tracking-tight">
                {appointment.patientName}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-wider bg-primary/5 text-primary border-primary/20 bg-blue-50/50 dark:bg-blue-900/20">
                {appointment.type || 'Sessão Regular'}
              </Badge>
              {appointment.phone && (
                <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                  {appointment.phone}
                </span>
              )}
            </div>
          </div>
          {appointment.phone && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400 shrink-0 shadow-sm transition-all active:scale-95 group"
              onClick={() => window.open(`https://wa.me/55${appointment.phone?.replace(/\D/g, '')}`, '_blank')}
            >
              <MessageCircle className="h-5 w-5 group-hover:rotate-12 transition-transform" />
            </Button>
          )}
        </div>

        <Separator className="bg-slate-100 dark:bg-slate-800/50" />

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 gap-5">
          {/* Fisioterapeuta */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              <Users className="h-3 w-3" />
              Fisioterapeuta Responsável
            </div>
            <Select
              value={localTherapistId || THERAPIST_SELECT_NONE}
              onValueChange={(v) => handleTherapistChange(v === THERAPIST_SELECT_NONE ? '' : v)}
            >
              <SelectTrigger className="h-10 w-full bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                <SelectValue>
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

          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Status
              </div>
              <Select
                value={localStatus}
                onValueChange={handleStatusChange}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="h-10 w-full bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                  <SelectValue>
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_CONFIG[localStatus as keyof typeof STATUS_CONFIG]?.color || '#94a3b8' }} />
                      <span className="truncate">{STATUS_CONFIG[localStatus as keyof typeof STATUS_CONFIG]?.label || localStatus}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG)
                    .filter(([key]) => [
                      'agendado', 'confirmado', 'em_andamento', 'realizado',
                      'cancelado', 'falta', 'remarcado', 'aguardando_confirmacao',
                      'em_espera', 'avaliacao'
                    ].includes(key))
                    .map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pagamento */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                <CreditCard className="h-3 w-3" />
                Financeiro
              </div>
              <Select
                value={isPaid ? 'paid' : 'pending'}
                onValueChange={handlePaymentStatusChange}
              >
                <SelectTrigger className={cn(
                  "h-10 w-full border-slate-200 dark:border-slate-800",
                  isPaid ? "bg-emerald-50/50 dark:bg-emerald-900/20" : "bg-amber-50/50 dark:bg-amber-900/20"
                )}>
                  <SelectValue>
                    {isPaid ? (
                      <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        Pago
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 text-xs">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        Pendente
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Notes (if available) */}
        {appointment.notes && (
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 border-dashed">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <NotepadText className="h-3 w-3" />
              Observações
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
              "{appointment.notes}"
            </p>
          </div>
        )}

        {/* Pacote: Sessão X de Y (quando vinculado) */}
        {linkedPackage != null && sessionNumber != null && sessionTotal != null && sessionTotal > 0 && (
          <div className="space-y-3 p-4 rounded-xl bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                <Package className="h-3.5 w-3.5" />
                Uso do Pacote
              </div>
              <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-400">
                Sessão {sessionNumber} / {sessionTotal}
              </span>
            </div>
            <Progress
              value={(sessionNumber / sessionTotal) * 100}
              className="h-2 w-full bg-blue-100/50 dark:bg-blue-900/40"
            />
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-border flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {onEdit && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl bg-background shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 flex-1 rounded-xl bg-background shadow-sm font-bold text-xs gap-2 transition-all hover:border-primary/30"
                onClick={handleEdit}
              >
                <CalendarClock className="h-4 w-4 text-primary" />
                Reagendar
              </Button>
            </>
          )}

          {onDelete && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl text-destructive/70 hover:text-destructive hover:bg-destructive/10 bg-background shadow-sm transition-colors shrink-0 border-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {canStartAttendance && (
          <Button
            onClick={handleStartAttendance}
            className={cn(
              "w-full h-11 rounded-xl font-extrabold text-sm shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98]",
              localStatus === 'avaliacao'
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
            )}
          >
            <div className="flex items-center justify-center gap-2.5">
              {localStatus === 'avaliacao' ? (
                <FileText className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
              {localStatus === 'avaliacao' ? 'INICIAR AVALIAÇÃO' : 'INICIAR ATENDIMENTO'}
            </div>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full h-9 rounded-lg text-xs text-muted-foreground hover:text-foreground font-bold uppercase tracking-tight"
          onClick={() => {
            setShowWaitlistQuickAdd(true);
            onOpenChange?.(false);
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
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
          <PopoverAnchor asChild>
            {children}
          </PopoverAnchor>
          <PopoverContent
            className="w-[340px] max-w-sm p-0 bg-card border border-border shadow-2xl z-50 rounded-2xl overflow-hidden"
            align="start"
            side="right"
            sideOffset={12}
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
