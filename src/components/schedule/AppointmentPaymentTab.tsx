import { useEffect } from "react";
import { AlertTriangle, Check, Package, Zap, CreditCard, Wallet, Banknote, DollarSign } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePatientPackages } from "@/hooks/usePackages";
import { cn } from "@/lib/utils";
import type { AppointmentFormData } from "@/types/appointment";
import { NewPackagePopover } from "./NewPackagePopover";

const AVULSA_PRICE = 180;
const PACOTE_PRICE = 170;

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX", icon: <Wallet className="h-4 w-4" /> },
  { value: "dinheiro", label: "Dinheiro", icon: <Banknote className="h-4 w-4" /> },
  { value: "debito", label: "Débito", icon: <CreditCard className="h-4 w-4" /> },
  { value: "credito", label: "Crédito", icon: <CreditCard className="h-4 w-4" /> },
] as const;

interface AppointmentPaymentTabProps {
  disabled: boolean;
  watchPaymentStatus: string;
  watchPaymentMethod: string;
  watchPaymentAmount: number;
  patientId?: string;
  patientName?: string;
}

export function AppointmentPaymentTab({
  disabled,
  watchPaymentStatus,
  watchPaymentMethod,
  watchPaymentAmount,
  patientId,
  patientName,
}: AppointmentPaymentTabProps) {
  const { register, setValue, watch } = useFormContext<AppointmentFormData>();
  const { data: patientPackages, isLoading: isLoadingPackages } = usePatientPackages(patientId);
  const selectedPackageId = watch("session_package_id") || "";

  const activePackages =
    patientPackages?.filter((p) => p.status === "active" && (p.sessions_remaining || 0) > 0) || [];
  const selectedPackage = activePackages.find((pkg) => pkg.id === selectedPackageId) || null;
  const resolvedPackage =
    selectedPackage || (activePackages.length === 1 ? activePackages[0] : null);
  const resolvedPatientName = patientName?.trim() || "Paciente selecionado acima";

  const isPaid = watchPaymentStatus !== "pending";
  const watchedStatus = watch("status");
  const isAvulsa = watchPaymentStatus === "paid_single";
  const isPacote = watchPaymentStatus === "paid_package";

  useEffect(() => {
    const nonChargingStatuses = [
      "cancelado",
      "faltou",
      "faltou_com_aviso",
      "faltou_sem_aviso",
      "nao_atendido",
      "nao_atendido_sem_cobranca",
      "remarcar",
    ];

    if (watchedStatus && nonChargingStatuses.includes(watchedStatus.toLowerCase())) {
      if (watchPaymentStatus !== "pending") {
        setValue("payment_status", "pending");
        setValue("payment_amount", 0);
        setValue("payment_method", "");
        setValue("session_package_id", null);
      }
    }
  }, [watchedStatus, setValue, watchPaymentStatus]);

  useEffect(() => {
    if (watchPaymentStatus !== "paid_package") return;

    if (!patientId) {
      if (selectedPackageId) {
        setValue("session_package_id", null);
      }
      return;
    }

    const packageStillValid = activePackages.some((pkg) => pkg.id === selectedPackageId);
    if (packageStillValid) return;

    if (activePackages.length === 1) {
      setValue("session_package_id", activePackages[0].id);
      return;
    }

    if (selectedPackageId) {
      setValue("session_package_id", null);
    }
  }, [activePackages, patientId, selectedPackageId, setValue, watchPaymentStatus]);

  const handlePaidChange = (checked: boolean) => {
    if (checked) {
      setValue("payment_status", "paid_single");
      setValue("payment_amount", AVULSA_PRICE);
      setValue("session_package_id", null);
    } else {
      setValue("payment_status", "pending");
      setValue("payment_amount", 0);
      setValue("payment_method", "");
      setValue("installments", 1);
      setValue("session_package_id", null);
    }
  };

  const handlePaymentTypeChange = (value: string) => {
    setValue("payment_status", value);
    if (value === "paid_single") {
      setValue("payment_amount", AVULSA_PRICE);
      setValue("session_package_id", null);
    } else if (value === "paid_package") {
      setValue("payment_amount", PACOTE_PRICE);
      setValue("payment_method", "");
      setValue("installments", 1);
      if (activePackages.length === 1) {
        setValue("session_package_id", activePackages[0].id);
      } else {
        setValue("session_package_id", null);
      }
    }
  };

  return (
    <div className="mt-0 space-y-3">

      {/* ── Header: Sessão Paga toggle ── */}
      <div className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border p-4 transition-all duration-300",
        isPaid
          ? "border-emerald-200/70 bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:border-emerald-800/40 dark:from-emerald-950/30 dark:to-teal-950/20"
          : "border-border/70 bg-gradient-to-r from-amber-50/60 to-background dark:border-amber-800/30 dark:from-amber-950/20",
      )}>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              isPaid
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
            )}>
              Financeiro
            </span>
            <Badge
              variant="outline"
              className={cn(
                "h-5 rounded-full border px-2 text-[10px] font-bold uppercase tracking-wider",
                isPaid
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
              )}
            >
              {isPaid ? "Pago" : "Pendente"}
            </Badge>
          </div>
          <Label htmlFor="payment-status-toggle" className="flex flex-col gap-0.5 cursor-pointer">
            <span className="font-semibold text-sm text-foreground">Sessão Paga</span>
            <span className="text-[11px] text-muted-foreground leading-snug">
              {isPaid
                ? "Pagamento registrado e pronto para conferência."
                : "Pagamento ainda não registrado."}
            </span>
          </Label>
        </div>
        <Switch
          id="payment-status-toggle"
          checked={isPaid}
          onCheckedChange={handlePaidChange}
          disabled={disabled}
          className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-300/80 shrink-0"
        />
      </div>

      <AnimatePresence>
        {isPaid && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-3"
          >

            {/* ── Type selector: Avulso vs Pacote ── */}
            <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-background to-muted/20 p-4 space-y-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Como foi o pagamento?
              </Label>
              <RadioGroup
                value={watchPaymentStatus}
                onValueChange={handlePaymentTypeChange}
                className="grid grid-cols-2 gap-2.5"
                disabled={disabled}
              >
                {/* Avulso */}
                <Label
                  htmlFor="paid_single"
                  className={cn(
                    "relative flex cursor-pointer flex-col items-center gap-2 overflow-hidden rounded-2xl border-2 p-4 text-center transition-all duration-200",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    isAvulsa
                      ? "border-amber-400/50 bg-gradient-to-b from-amber-50 to-amber-50/30 shadow-md shadow-amber-500/10 dark:border-amber-600/40 dark:from-amber-950/30"
                      : "border-border/60 bg-gradient-to-b from-background to-muted/10 hover:border-border",
                  )}
                >
                  <RadioGroupItem value="paid_single" id="paid_single" className="sr-only" />
                  {isAvulsa && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Imediato
                  </span>
                  <Zap className="h-6 w-6 text-amber-500" />
                  <div className="space-y-0.5">
                    <span className="block font-bold text-sm text-foreground">Avulso</span>
                    <span className="block text-[11px] text-muted-foreground leading-tight">
                      Cobrança direta desta sessão
                    </span>
                  </div>
                  <span className={cn(
                    "text-base font-extrabold transition-colors",
                    isAvulsa ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground/60",
                  )}>
                    R$ {AVULSA_PRICE}
                  </span>
                </Label>

                {/* Pacote */}
                <Label
                  htmlFor="paid_package"
                  className={cn(
                    "relative flex cursor-pointer flex-col items-center gap-2 overflow-hidden rounded-2xl border-2 p-4 text-center transition-all duration-200",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    isPacote
                      ? "border-blue-400/50 bg-gradient-to-b from-blue-50 to-blue-50/30 shadow-md shadow-blue-500/10 dark:border-blue-600/40 dark:from-blue-950/30"
                      : "border-border/60 bg-gradient-to-b from-background to-muted/10 hover:border-border",
                    !patientId && "cursor-not-allowed opacity-60 saturate-75",
                  )}
                >
                  <RadioGroupItem
                    value="paid_package"
                    id="paid_package"
                    className="sr-only"
                    disabled={!patientId}
                  />
                  {isPacote && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Fidelizado
                  </span>
                  <Package className="h-6 w-6 text-blue-500" />
                  <div className="space-y-0.5">
                    <span className="block font-bold text-sm text-foreground">Pacote</span>
                    <span className="block text-[11px] text-muted-foreground leading-tight">
                      {patientId ? "Consome saldo contratado" : "Escolha o paciente acima"}
                    </span>
                  </div>
                  <span className={cn(
                    "text-base font-extrabold transition-colors",
                    isPacote ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground/60",
                  )}>
                    R$ {PACOTE_PRICE}
                  </span>
                </Label>
              </RadioGroup>
            </div>

            {/* ── Package details (only when paid_package) ── */}
            <AnimatePresence>
              {isPacote && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-b from-blue-50/80 to-background p-4 space-y-3 dark:border-blue-800/40 dark:from-blue-950/20">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                        <Package className="h-3.5 w-3.5" />
                        Pacote do paciente
                      </Label>
                      {patientId && (
                        <Badge variant="outline" className="rounded-full border-blue-500/15 bg-blue-500/10 px-2 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                          Vinculado
                        </Badge>
                      )}
                    </div>

                    {patientId ? (
                      <>
                        {isLoadingPackages ? (
                          <div className="h-10 rounded-xl bg-blue-100/50 animate-pulse dark:bg-blue-900/20" />
                        ) : activePackages.length === 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span>Nenhum pacote ativo. Registre um pacote de 10 sessões para este paciente.</span>
                            </div>
                            <NewPackagePopover
                              patientId={patientId}
                              triggerLabel="Registrar 10 sessões"
                              triggerClassName="w-full h-10 rounded-xl border-blue-500/25 bg-blue-500/10 text-xs font-bold text-blue-700 hover:bg-blue-500/15 dark:text-blue-300"
                              presetPackage={{
                                name: "Pacote 10 Sessões",
                                sessionsCount: 10,
                                totalPrice: 1700,
                                validityDays: 365,
                                title: "Registrar pacote de 10 sessões",
                                description: "O paciente já vem preenchido. Ao confirmar, o pacote entra no perfil e este agendamento fica vinculado ao saldo.",
                                submitLabel: "Registrar pacote",
                              }}
                              onPackageCreated={(newPackageId) => {
                                setValue("session_package_id", newPackageId);
                              }}
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {activePackages.length > 1 && (
                              <Select
                                value={selectedPackageId}
                                onValueChange={(val) => setValue("session_package_id", val)}
                                disabled={disabled}
                              >
                                <SelectTrigger className="h-10 rounded-xl border-blue-200/70 bg-background text-xs">
                                  <SelectValue placeholder="Selecione o pacote para debitar" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border border-blue-100 p-1">
                                  {activePackages.map((pkg) => (
                                    <SelectItem key={pkg.id} value={pkg.id}>
                                      {pkg.package?.name} ({pkg.sessions_remaining} sessões restantes)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {resolvedPackage && (
                              <div className="flex items-center justify-between gap-3 rounded-xl bg-blue-500/10 border border-blue-200/50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-950/30">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 truncate">
                                    {resolvedPackage.package?.name ?? "Pacote ativo"}
                                  </p>
                                  <p className="text-[10px] text-blue-700/70 dark:text-blue-300/70 mt-0.5">
                                    {activePackages.length === 1
                                      ? "Vinculado automaticamente"
                                      : "Saldo a ser debitado"}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-extrabold text-blue-700 shadow-sm dark:bg-blue-950/60 dark:text-blue-200">
                                  {resolvedPackage.sessions_remaining} restantes
                                </span>
                              </div>
                            )}

                            {resolvedPackage && (resolvedPackage.sessions_remaining || 0) <= 1 && (
                              <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-[11px] font-medium">
                                  Última sessão deste pacote. Vale oferecer renovação.
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-[11px] text-amber-700">
                        Selecione o paciente no topo do modal para vincular ao pacote.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Valor ── */}
            <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-background to-muted/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  {isPacote ? "Valor por Sessão (R$)" : "Valor da Sessão (R$)"}
                </Label>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  isAvulsa ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700",
                )}>
                  Ref: R$ {isAvulsa ? AVULSA_PRICE : PACOTE_PRICE}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-primary">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("payment_amount", { valueAsNumber: true })}
                  className="flex h-13 w-full rounded-xl border border-border/70 bg-background pl-12 pr-4 py-2 text-xl font-extrabold text-foreground shadow-sm transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={disabled}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {isPacote
                  ? "Valor de referência interno por sessão. O pacote é contabilizado no perfil do paciente."
                  : "Referência rápida: pacote R$ 170/sessão · avulso R$ 180/sessão."}
              </p>
            </div>

            {/* ── Forma de Pagamento (only for avulsa) ── */}
            <AnimatePresence>
              {isAvulsa && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-background to-muted/20 p-4 space-y-3">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Forma de Pagamento
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {PAYMENT_METHODS.map((method) => {
                        const isSelected = watchPaymentMethod === method.value;
                        return (
                          <Button
                            key={method.value}
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-16 flex-col gap-1.5 rounded-xl border-2 text-[10px] font-bold uppercase tracking-wide transition-all duration-150 hover:-translate-y-0.5",
                              isSelected
                                ? "border-primary bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
                                : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30",
                            )}
                            onClick={() => setValue("payment_method", method.value)}
                            disabled={disabled}
                          >
                            <span className={isSelected ? "text-white" : "text-slate-400"}>
                              {method.icon}
                            </span>
                            {method.label}
                          </Button>
                        );
                      })}
                    </div>

                    {/* Parcelas para crédito */}
                    <AnimatePresence>
                      {watchPaymentMethod === "credito" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 border-t border-border/60 space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Parcelas (até 6x sem juros)</Label>
                            <Select
                              value={watch("installments")?.toString()}
                              onValueChange={(value) => setValue("installments", parseInt(value))}
                              disabled={disabled}
                            >
                              <SelectTrigger className="h-10 rounded-xl border-border/60 text-xs">
                                <SelectValue placeholder="Parcelas" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border border-blue-100 p-1">
                                {[1, 2, 3, 4, 5, 6].map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    {num}x de R$ {(watchPaymentAmount / num).toFixed(2)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Pacote: forma de pgto irrelevante ── */}
            <AnimatePresence>
              {isPacote && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
                    <div className="mt-0.5 rounded-full bg-white p-1.5 shadow-sm dark:bg-blue-950/40">
                      <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                        Pagamento identificado por pacote
                      </p>
                      <p className="mt-0.5 text-[11px] text-blue-700/70 dark:text-blue-300/70 leading-relaxed">
                        A forma de pagamento é registrada no cadastro do próprio pacote. Aqui apenas vinculamos o saldo do paciente.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
