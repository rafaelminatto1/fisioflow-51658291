import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Play,
  Edit,
  Trash2,
  Clock,
  X,
  Bell,
  Users,
  UserPlus,
  FileText,
  CheckCircle2,
  AlertCircle,
  Package,
  MessageCircle,
  Timer,
  NotepadText,
  CreditCard,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  useTherapists,
  formatTherapistLabel,
  getTherapistById,
  THERAPIST_SELECT_NONE,
} from "@/hooks/useTherapists";
import { WaitlistNotification } from "./WaitlistNotification";
import { WaitlistQuickAdd } from "./WaitlistQuickAdd";
import { PaymentRegistrationModal } from "./PaymentRegistrationModal";
import { Appointment } from "@/types/appointment";
import { useAppointmentQuickViewLogic } from "./hooks/useAppointmentQuickViewLogic";
import { useStatusConfig } from "@/hooks/useStatusConfig";

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
  const isMobile = useIsMobile();
  const { therapists = [] } = useTherapists();

  const logic = useAppointmentQuickViewLogic({
    appointment,
    onEdit,
    onOpenChange,
  });

  const {
    localStatus,
    localPaymentStatus,
    localTherapistId,
    appointmentDate,
    interestCount,
    hasWaitlistInterest,
    showWaitlistNotification,
    setShowWaitlistNotification,
    showWaitlistQuickAdd,
    setShowWaitlistQuickAdd,
    showPaymentModal,
    setShowPaymentModal,
    showNoShowConfirmDialog,
    setShowNoShowConfirmDialog,
    handleStartAttendance,
    handleStatusChange,
    handleNoShowConfirm,
    handleNoShowReschedule,
    handleTherapistChange,
    handlePaymentStatusChange,
    handlePaymentSuccess,
    patientPackages,
    isUpdatingStatus,
  } = logic;

  const { statusConfig: statusConfigMap, allStatuses } = useStatusConfig();
  const statusConfig = statusConfigMap[localStatus] || statusConfigMap.agendado;

  const linkedPackage = useMemo(() => {
    if (!appointment.session_package_id) return null;
    return patientPackages.find((p) => p.id === appointment.session_package_id) ?? null;
  }, [patientPackages, appointment.session_package_id]);

  const sessionNumber = linkedPackage ? linkedPackage.sessions_used + 1 : null;
  const sessionTotal = linkedPackage ? linkedPackage.sessions_purchased : null;
  const isPaid = localPaymentStatus === "paid" || localPaymentStatus === "pago";
  const isPackagePayment =
    Boolean(appointment.session_package_id) || appointment.payment_method === "package";

  const time = appointment.time && appointment.time.trim() ? appointment.time : "00:00";
  const startHour = parseInt(time.split(":")[0] || "0");
  const startMinute = parseInt(time.split(":")[1] || "0");
  const endMinutes = startHour * 60 + startMinute + (appointment.duration || 60);
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

  const Content = (
    <div className="flex flex-col h-full min-w-0 max-w-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 relative overflow-hidden">
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="p-2 bg-primary/10 rounded-lg ring-1 ring-primary/15">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-foreground">
              {appointment.time} — {endTime}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              <Timer className="h-2.5 w-2.5" />
              {appointment.duration || 60} min
            </div>
          </div>
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-muted/80 relative z-10"
            onClick={() => onOpenChange?.(false)}
            aria-label="Fechar detalhes"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>

      {hasWaitlistInterest && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
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
              {interestCount} interessado{interestCount !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px] text-amber-700/70 dark:text-amber-400/70 font-medium">
              Clique para gerenciar fila
            </span>
          </div>
          <Bell className="h-3.5 w-3.5 text-amber-600 ml-auto animate-pulse" aria-hidden="true" />
        </motion.div>
      )}

      <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 truncate leading-tight tracking-tight">
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/patients/${appointment.patientId}`;
                  onOpenChange?.(false);
                }}
                className="block w-full truncate text-left hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
              >
                {appointment.patientName}
              </button>
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className="font-bold text-[10px] uppercase tracking-wider bg-primary/5 text-primary border-primary/20"
              >
                {appointment.type || "Sessão Regular"}
              </Badge>
              {appointment.phone && (
                <span className="text-[10px] text-muted-foreground font-medium">
                  {appointment.phone}
                </span>
              )}
            </div>
          </div>
          {appointment.phone && (
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400 shrink-0 shadow-sm transition-all active:scale-95 group"
              onClick={() =>
                window.open(`https://wa.me/55${appointment.phone?.replace(/\D/g, "")}`, "_blank")
              }
            >
              <MessageCircle className="h-4 w-4 group-hover:rotate-12 transition-transform" />
            </Button>
          )}
        </div>

        <Separator className="bg-border/50" />

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              <Users className="h-3 w-3" />
              Fisioterapeuta
            </div>
            <Select
              value={localTherapistId || THERAPIST_SELECT_NONE}
              onValueChange={(v) => handleTherapistChange(v === THERAPIST_SELECT_NONE ? "" : v)}
            >
              <SelectTrigger className="h-9 w-full bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-sm">
                <SelectValue>
                  {getTherapistById(therapists, localTherapistId)?.name ?? "Activity Fisioterapia"}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    statusConfig.iconColor.replace("text-", "bg-"),
                  )}
                />
                Status
              </div>
              <Select
                value={localStatus}
                onValueChange={handleStatusChange}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="h-9 w-full bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-sm">
                  <SelectValue>
                    <div className="flex items-center gap-1.5 truncate">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: (statusConfig as any).color }}
                      />
                      <span className="truncate text-xs">{statusConfig.label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allStatuses.map((val) => {
                    const cfg = statusConfigMap[val] || statusConfigMap.agendado;
                    return (
                      <SelectItem key={val} value={val}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: (cfg as any).color }}
                          />
                          <span>{cfg.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                <CreditCard className="h-3 w-3" />
                Financeiro
              </div>
              <Select value={isPaid ? "paid" : "pending"} onValueChange={handlePaymentStatusChange}>
                <SelectTrigger
                  className={cn(
                    "h-9 w-full border-slate-200 dark:border-slate-800",
                    isPaid
                      ? isPackagePayment
                        ? "bg-blue-50/60 dark:bg-blue-900/20"
                        : "bg-emerald-50/50 dark:bg-emerald-900/20"
                      : "bg-amber-50/50 dark:bg-amber-900/20",
                  )}
                >
                  <SelectValue>
                    {isPaid ? (
                      isPackagePayment ? (
                        <span className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-400 text-[11px]">
                          <Package className="h-3 w-3 shrink-0" />
                          Pago via pacote
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          Pago
                        </span>
                      )
                    ) : (
                      <span className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 text-[11px]">
                        <AlertCircle className="h-3 w-3 shrink-0" />
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

        {linkedPackage != null &&
          sessionNumber != null &&
          sessionTotal != null &&
          sessionTotal > 0 && (
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

      <div className="p-3 bg-muted/30 border-t border-border space-y-2">
        <Button
          onClick={handleStartAttendance}
          className={cn(
            "w-full h-12 rounded-xl font-black text-sm shadow-lg transition-all active:scale-[0.98] tracking-tight",
            localStatus === "avaliacao"
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
          )}
        >
          <div className="flex items-center justify-center gap-2">
            {localStatus === "avaliacao" ? (
              <FileText className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
            {localStatus === "avaliacao" ? "INICIAR AVALIAÇÃO" : "INICIAR ATENDIMENTO"}
          </div>
        </Button>

        <div className="flex items-center gap-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 flex-1 rounded-xl font-bold text-xs gap-1.5 border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all"
              onClick={() => {
                onEdit();
                onOpenChange?.(false);
              }}
            >
              <Edit className="h-3.5 w-3.5" />
              Editar
            </Button>
          )}

          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
              onClick={() => {
                onDelete();
                onOpenChange?.(false);
              }}
              title="Excluir Agendamento"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          <div className="h-6 w-px bg-slate-200 mx-0.5" />

          <Button
            variant="ghost"
            size="sm"
            className="h-10 px-3 rounded-xl font-bold text-xs gap-1.5 text-slate-500 hover:bg-slate-100 transition-all"
            onClick={() => {
              setShowWaitlistQuickAdd(true);
              onOpenChange?.(false);
            }}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Lista de Espera
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[90vh]" data-week-appointment="true">
            <DrawerHeader className="text-left border-b pb-4 hidden">
              <DrawerTitle>Detalhes do Agendamento</DrawerTitle>
              <DrawerDescription>Visualizar e editar detalhes do agendamento</DrawerDescription>
            </DrawerHeader>
            <div className="pb-6 animate-in slide-in-from-bottom-4 duration-300">{Content}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverAnchor asChild>
            {React.isValidElement(children) ? (
              React.cloneElement(children as React.ReactElement<any>, {
                "data-appointment-popover-anchor": appointment.id,
              })
            ) : (
              <div data-appointment-popover-anchor={appointment.id}>{children}</div>
            )}
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
            data-week-appointment="true"
            onInteractOutside={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest(`[data-appointment-popover-anchor="${appointment.id}"]`))
                e.preventDefault();
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={open ? "open" : "closed"}
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              >
                {Content}
              </motion.div>
            </AnimatePresence>
          </PopoverContent>
        </Popover>
      )}

      <WaitlistNotification
        open={showWaitlistNotification}
        onOpenChange={setShowWaitlistNotification}
        date={appointmentDate}
        time={time}
      />
      <WaitlistQuickAdd
        open={showWaitlistQuickAdd}
        onOpenChange={setShowWaitlistQuickAdd}
        date={appointmentDate}
        time={time}
      />

      <AlertDialog open={showNoShowConfirmDialog} onOpenChange={setShowNoShowConfirmDialog}>
        <AlertDialogContent
          className="max-w-md p-0 overflow-hidden rounded-2xl"
          data-week-appointment="true"
        >
          <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 p-6 pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-xl ring-1 ring-red-200 dark:ring-red-800">
                <Calendar className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Registrar Falta
                </AlertDialogTitle>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {appointment.patientName}
                </p>
              </div>
            </div>
          </div>
          <AlertDialogDescription className="sr-only">
            Confirmação de falta - deseja reagendar o atendimento?
          </AlertDialogDescription>
          <div className="px-6 py-5">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                O status do agendamento será alterado para{" "}
                <span className="inline-flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Falta
                </span>
                .
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Deseja reagendar este atendimento para outra data?
              </p>
            </div>
          </div>
          <div className="px-6 pb-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
            <AlertDialogCancel className="flex-1 h-11 rounded-xl font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
              Voltar
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleNoShowConfirm}
              className="flex-1 h-11 rounded-xl font-semibold border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
            >
              Apenas registrar falta
            </Button>
            <AlertDialogAction
              onClick={handleNoShowReschedule}
              className="flex-1 h-11 rounded-xl font-semibold bg-primary hover:bg-primary/90"
            >
              Registrar e reagendar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <PaymentRegistrationModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        appointment={appointment}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
};
