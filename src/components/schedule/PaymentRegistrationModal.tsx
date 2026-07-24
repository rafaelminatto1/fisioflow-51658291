import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarIcon,
  Loader2,
  DollarSign,
  BadgeCheck,
  CreditCard,
  Wallet,
  Banknote,
  Package,
  Zap,
  Check,
  Sparkles,
} from "lucide-react";
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FinancialService } from "@/services/financialService";
import { useUpdateAppointment } from "@/hooks/useAppointments";
import type { Appointment } from "@/types/appointment";
import { useIsMobile } from "@/hooks/use-mobile";

const AVULSA_PRICE = 180;
const PACOTE_PRICE = 170;

const paymentSchema = z.object({
  type: z.enum(["single_session", "package"]),
  amount: z.number().min(0.01, "Valor deve ser maior que zero"),
  method: z.string().min(1, "Selecione um método de pagamento"),
  date: z.date(),
  description: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentRegistrationModalProps {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX", icon: <Wallet className="h-5 w-5" />, color: "emerald" },
  { value: "dinheiro", label: "Dinheiro", icon: <Banknote className="h-5 w-5" />, color: "orange" },
  { value: "debito", label: "Débito", icon: <CreditCard className="h-5 w-5" />, color: "blue" },
  { value: "credito", label: "Crédito", icon: <CreditCard className="h-5 w-5" />, color: "indigo" },
] as const;

const PAYMENT_TYPE_CONFIG = {
  single_session: {
    label: "Sessão Avulsa",
    badge: "Imediato",
    icon: <Zap className="h-5 w-5 text-amber-500" />,
    description: "Cobrança direta desta sessão",
    price: AVULSA_PRICE,
    gradient: "from-amber-500/10 to-amber-500/5",
    border: "border-amber-500/25",
    badgeColor: "bg-amber-500/10 text-amber-700",
  },
  package: {
    label: "Pacote / Plano",
    badge: "Fidelizado",
    icon: <Package className="h-5 w-5 text-blue-500" />,
    description: `R$ ${PACOTE_PRICE}/sessão contratado`,
    price: PACOTE_PRICE,
    gradient: "from-blue-500/10 to-blue-500/5",
    border: "border-blue-500/25",
    badgeColor: "bg-blue-500/10 text-blue-700",
  },
};

export function PaymentRegistrationModal({
  appointment,
  open,
  onOpenChange,
  onSuccess,
}: PaymentRegistrationModalProps) {
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { mutateAsync: updateAppointment } = useUpdateAppointment();

  const isPackage = Boolean(appointment.session_package_id);
  const defaultType = isPackage ? "package" : "single_session";
  const defaultAmount = isPackage ? PACOTE_PRICE : AVULSA_PRICE;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      type: defaultType,
      amount: appointment.payment_amount ? Number(appointment.payment_amount) : defaultAmount,
      method: "pix",
      date: new Date(),
      description: "",
    },
  });

  const { setValue, watch, handleSubmit, formState: { errors }, reset } = form;

  useEffect(() => {
    if (open) {
      const type = isPackage ? "package" : "single_session";
      const amount = isPackage ? PACOTE_PRICE : AVULSA_PRICE;
      reset({
        type,
        amount: appointment.payment_amount ? Number(appointment.payment_amount) : amount,
        method: "pix",
        date: new Date(),
        description: `Pagamento referente ao atendimento de ${appointment.patientName}`,
      });
    }
  }, [open, appointment, reset, isPackage]);

  const watchedType = watch("type");
  const watchedMethod = watch("method");
  const watchedAmount = watch("amount");
  const watchedDate = watch("date");

  // Auto-fill price when type changes
  const handleTypeChange = (type: "single_session" | "package") => {
    setValue("type", type);
    setValue("amount", type === "single_session" ? AVULSA_PRICE : PACOTE_PRICE);
  };

  const onSubmit = async (data: PaymentFormValues) => {
    setIsSubmitting(true);
    try {
      await FinancialService.createTransaction({
        tipo: "receita",
        category: data.type === "package" ? "Pacote" : "Atendimento",
        descricao: data.description || `Pagamento - ${appointment.patientName}`,
        valor: data.amount,
        status: "concluido",
        metadata: {
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          paymentMethod: data.method,
          paymentType: data.type,
        },
        user_id: appointment.therapistId,
      });

      await updateAppointment({
        appointmentId: appointment.id,
        updates: { payment_status: "paid" },
        suppressSuccessToast: true,
      });

      toast.success("Pagamento registrado com sucesso!");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      toast.error("Erro ao registrar pagamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeConfig = PAYMENT_TYPE_CONFIG[watchedType];

  return (
    <CustomModal open={open} onOpenChange={onOpenChange} isMobile={isMobile} contentClassName="max-w-md">
      <CustomModalHeader onClose={() => onOpenChange(false)}>
        <CustomModalTitle className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 rounded-lg">
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          Registrar Pagamento
        </CustomModalTitle>
      </CustomModalHeader>

      <CustomModalBody className="p-0 sm:p-0">
        <form id="payment-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="px-5 py-4 space-y-5">

            {/* Patient Card */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {appointment.patientName?.charAt(0)?.toUpperCase() ?? "P"}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Paciente</p>
                <p className="text-sm font-semibold text-emerald-900 truncate">{appointment.patientName}</p>
              </div>
              {isPackage && (
                <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                  <Package className="h-3 w-3" /> Pacote
                </span>
              )}
            </div>

            {/* Type Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tipo de Cobrança
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                {(["single_session", "package"] as const).map((type) => {
                  const cfg = PAYMENT_TYPE_CONFIG[type];
                  const isSelected = watchedType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all duration-200",
                        "hover:-translate-y-0.5 hover:shadow-md",
                        isSelected
                          ? `${cfg.border} bg-gradient-to-b ${cfg.gradient} shadow-md`
                          : "border-border/60 bg-gradient-to-b from-background to-muted/20 hover:border-border",
                      )}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </span>
                      )}
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                        cfg.badgeColor,
                      )}>
                        {cfg.badge}
                      </span>
                      <div className="flex flex-col items-center gap-1">
                        {cfg.icon}
                        <span className="text-xs font-bold text-foreground">{cfg.label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{cfg.description}</span>
                      </div>
                      {isSelected && (
                        <span className="text-sm font-extrabold text-foreground">
                          R$ {cfg.price}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount with smart hint */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Valor Recebido
                </Label>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={watchedType}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                      watchedType === "single_session"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700",
                    )}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    {watchedType === "single_session" ? "Avulso: R$180" : "Pacote: R$170/sessão"}
                  </motion.span>
                </AnimatePresence>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-600">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={watchedAmount}
                  onChange={(e) => setValue("amount", parseFloat(e.target.value) || 0)}
                  className={cn(
                    "flex h-14 w-full rounded-2xl border bg-gradient-to-b from-background to-muted/20",
                    "pl-12 pr-4 text-2xl font-extrabold text-foreground",
                    "shadow-sm ring-offset-background transition-all",
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary/40",
                    "placeholder:text-muted-foreground/40",
                    errors.amount ? "border-destructive/50" : "border-border/70",
                  )}
                  placeholder="0"
                />
              </div>
              {errors.amount && (
                <p className="text-[10px] text-destructive font-medium">{errors.amount.message}</p>
              )}
            </div>

            {/* Payment Methods — only for avulsa */}
            <AnimatePresence>
              {watchedType === "single_session" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Forma de Pagamento
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {PAYMENT_METHODS.map((m) => {
                        const isSelected = watchedMethod === m.value;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setValue("method", m.value)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 text-[10px] font-bold uppercase tracking-wide transition-all duration-150 hover:-translate-y-0.5",
                              isSelected
                                ? "border-primary bg-primary text-white shadow-lg shadow-primary/20"
                                : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground",
                            )}
                          >
                            <span className={isSelected ? "text-white" : "text-slate-500"}>
                              {m.icon}
                            </span>
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                    {errors.method && (
                      <p className="text-[10px] text-destructive font-medium">{errors.method.message}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Package info banner */}
            <AnimatePresence>
              {watchedType === "package" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-3.5">
                    <div className="mt-0.5 p-1.5 bg-blue-100 rounded-lg shrink-0">
                      <Check className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-800">Pagamento via pacote</p>
                      <p className="text-[11px] text-blue-600/80 mt-0.5 leading-relaxed">
                        A forma de pagamento é registrada no cadastro do pacote. Aqui apenas vinculamos o saldo do paciente a esta sessão.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Date Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Data do Recebimento
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-medium rounded-2xl border-border/70 h-11 hover:border-primary/30 transition-colors",
                      !watchedDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                    {watchedDate
                      ? format(watchedDate, "PPP", { locale: ptBR })
                      : <span>Selecione a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[110]" align="start">
                  <Calendar
                    mode="single"
                    selected={watchedDate}
                    onSelect={(d) => {
                      if (d) {
                        setValue("date", d);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </form>
      </CustomModalBody>

      <CustomModalFooter isMobile={isMobile}>
        <Button
          type="button"
          variant="ghost"
          className="rounded-xl h-11 px-6 font-bold text-slate-500"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          form="payment-form"
          disabled={isSubmitting}
          className="rounded-xl h-11 px-8 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 font-bold uppercase tracking-wider"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BadgeCheck className="h-4 w-4" />
          )}
          Confirmar Pagamento
        </Button>
      </CustomModalFooter>
    </CustomModal>
  );
}
