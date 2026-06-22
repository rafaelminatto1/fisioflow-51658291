import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Shield, CalendarRange, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/schedule/settings/shared/SectionCard";
import { FieldRow } from "@/components/schedule/settings/shared/FieldRow";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useBookingWindow, type BookingWindowData } from "@/hooks/useBookingWindow";
import { useNoShowPolicy, type NoShowPolicy, type NoShowAction } from "@/hooks/useNoShowPolicy";
import { useTabDirtyState } from "../useTabDirtyState";
import { cn } from "@/lib/utils";
import type { TabComponentProps } from "../types";

const NOSHOW_ACTIONS: Array<{ value: NoShowAction; label: string; description: string }> = [
  {
    value: "warn",
    label: "Apenas avisar",
    description: "Marcar paciente sem impedir agendamentos",
  },
  {
    value: "block_online",
    label: "Bloquear auto-agendamento",
    description: "Paciente perde acesso ao portal",
  },
  {
    value: "suspend",
    label: "Suspender por período",
    description: "Bloqueia qualquer agendamento por N dias",
  },
  { value: "charge", label: "Cobrar taxa", description: "Aplica taxa configurada por falta" },
];

interface PolicyState {
  notif: {
    send_confirmation_email: boolean;
    send_confirmation_whatsapp: boolean;
    send_reminder_24h: boolean;
    send_reminder_2h: boolean;
    send_cancellation_notice: boolean;
  };
  rules: {
    min_hours_before: number;
    allow_patient_cancellation: boolean;
    max_cancellations_month: number;
    charge_late_cancellation: boolean;
    late_cancellation_fee: number;
  };
  booking: BookingWindowData;
  noShow: NoShowPolicy;
}

const DEFAULT_NOTIF = {
  send_confirmation_email: true,
  send_confirmation_whatsapp: true,
  send_reminder_24h: true,
  send_reminder_2h: false,
  send_cancellation_notice: true,
};

const DEFAULT_RULES = {
  min_hours_before: 24,
  allow_patient_cancellation: true,
  max_cancellations_month: 3,
  charge_late_cancellation: false,
  late_cancellation_fee: 0,
};

function buildInitial(
  notif: typeof DEFAULT_NOTIF,
  rules: typeof DEFAULT_RULES,
  booking: BookingWindowData,
  noShow: NoShowPolicy,
): PolicyState {
  return { notif, rules, booking, noShow };
}

export function PoliticasTab({ registerHandle }: TabComponentProps) {
  const {
    cancellationRules,
    notificationSettings,
    upsertCancellationRules,
    upsertNotificationSettings,
    isSavingRules,
    isSavingNotifications,
  } = useScheduleSettings();

  const { data: bookingData, save: saveBookingMutate, isSaving: isSavingBooking } = useBookingWindow();
  const { data: nsData, save: saveNoShowMutate, isSaving: isSavingNoShow } = useNoShowPolicy();

  const initial = buildInitial(DEFAULT_NOTIF, DEFAULT_RULES, bookingData, nsData);
  const { value, setValue, isDirty, reset } = useTabDirtyState<PolicyState>(initial);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const serverSignature = JSON.stringify({
    notif: notificationSettings ?? null,
    rules: cancellationRules ?? null,
    booking: bookingData,
    noShow: nsData,
  });
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastSignatureRef.current === serverSignature) return;
    lastSignatureRef.current = serverSignature;
    reset({
      notif: notificationSettings
        ? {
            send_confirmation_email: notificationSettings.send_confirmation_email,
            send_confirmation_whatsapp: notificationSettings.send_confirmation_whatsapp,
            send_reminder_24h: notificationSettings.send_reminder_24h,
            send_reminder_2h: notificationSettings.send_reminder_2h,
            send_cancellation_notice: notificationSettings.send_cancellation_notice,
          }
        : DEFAULT_NOTIF,
      rules: cancellationRules
        ? {
            min_hours_before: cancellationRules.min_hours_before,
            allow_patient_cancellation: cancellationRules.allow_patient_cancellation,
            max_cancellations_month: cancellationRules.max_cancellations_month,
            charge_late_cancellation: cancellationRules.charge_late_cancellation,
            late_cancellation_fee: cancellationRules.late_cancellation_fee,
          }
        : DEFAULT_RULES,
      booking: bookingData,
      noShow: nsData,
    });
  }, [serverSignature, notificationSettings, cancellationRules, bookingData, nsData, reset]);

  const isSaving = isSavingRules || isSavingNotifications || isSavingBooking || isSavingNoShow;

  const save = useMemo(
    () => async () => {
      const promises: Promise<unknown>[] = [];

      promises.push(
        new Promise<void>((resolve, reject) => {
          upsertNotificationSettings.mutate(value.notif, {
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          });
        }),
      );

      promises.push(
        new Promise<void>((resolve, reject) => {
          upsertCancellationRules.mutate(value.rules, {
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          });
        }),
      );

      promises.push(
        new Promise<void>((resolve, reject) => {
          saveBookingMutate(value.booking, {
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          });
        }),
      );

      promises.push(
        new Promise<void>((resolve, reject) => {
          saveNoShowMutate(value.noShow, {
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          });
        }),
      );

      await Promise.all(promises);
      reset(value);
      setLastSavedAt(new Date());
    },
    [value, upsertNotificationSettings, upsertCancellationRules, saveBookingMutate, saveNoShowMutate, reset],
  );

  useEffect(() => {
    registerHandle({ isDirty, isSaving, lastSavedAt, save, discard: () => reset() });
    return () => registerHandle(null);
  }, [isDirty, isSaving, lastSavedAt, save, reset, registerHandle]);

  const updateNotif = <K extends keyof PolicyState["notif"]>(k: K, v: PolicyState["notif"][K]) => {
    setValue((p) => ({ ...p, notif: { ...p.notif, [k]: v } }));
  };

  const updateRules = <K extends keyof PolicyState["rules"]>(k: K, v: PolicyState["rules"][K]) => {
    setValue((p) => ({ ...p, rules: { ...p.rules, [k]: v } }));
  };

  const updateBooking = <K extends keyof BookingWindowData>(k: K, v: BookingWindowData[K]) => {
    setValue((p) => ({ ...p, booking: { ...p.booking, [k]: v } }));
  };

  const updateNoShow = <K extends keyof NoShowPolicy>(k: K, v: NoShowPolicy[K]) => {
    setValue((p) => ({ ...p, noShow: { ...p.noShow, [k]: v } }));
  };

  const { notif, rules, booking, noShow } = value;

  return (
    <div className="space-y-5">
      <SectionCard
        icon={<Bell className="h-4 w-4" />}
        title="Notificações"
        description="Lembretes automáticos por email e WhatsApp"
      >
        <FieldRow
          label="Email de confirmação"
          description="Enviado após o agendamento"
          control={
            <Switch
              checked={notif.send_confirmation_email}
              onCheckedChange={(v) => updateNotif("send_confirmation_email", v)}
            />
          }
        />
        <FieldRow
          label="WhatsApp de confirmação"
          description="Mensagem automática via WhatsApp"
          control={
            <Switch
              checked={notif.send_confirmation_whatsapp}
              onCheckedChange={(v) => updateNotif("send_confirmation_whatsapp", v)}
            />
          }
        />
        <FieldRow
          label="Lembrete 24h antes"
          control={
            <Switch
              checked={notif.send_reminder_24h}
              onCheckedChange={(v) => updateNotif("send_reminder_24h", v)}
            />
          }
        />
        <FieldRow
          label="Lembrete 2h antes"
          control={
            <Switch
              checked={notif.send_reminder_2h}
              onCheckedChange={(v) => updateNotif("send_reminder_2h", v)}
            />
          }
        />
        <FieldRow
          label="Aviso de cancelamento"
          control={
            <Switch
              checked={notif.send_cancellation_notice}
              onCheckedChange={(v) => updateNotif("send_cancellation_notice", v)}
            />
          }
        />
      </SectionCard>

      <SectionCard
        icon={<Shield className="h-4 w-4" />}
        title="Regras de Cancelamento"
        description="Janela mínima, limites e cobrança por cancelamento tardio"
      >
        <FieldRow
          label="Permitir cancelamento pelo paciente"
          control={
            <Switch
              checked={rules.allow_patient_cancellation}
              onCheckedChange={(v) => updateRules("allow_patient_cancellation", v)}
            />
          }
        />
        <FieldRow
          label="Horas mínimas de antecedência"
          description="Tempo mínimo antes do horário para cancelar sem penalidade"
          control={
            <Input
              type="number"
              min={0}
              max={168}
              value={rules.min_hours_before}
              onChange={(e) => updateRules("min_hours_before", Number(e.target.value))}
              className="h-9 w-24 text-right"
            />
          }
        />
        <FieldRow
          label="Cancelamentos por mês"
          description="Limite por paciente"
          control={
            <Input
              type="number"
              min={0}
              max={30}
              value={rules.max_cancellations_month}
              onChange={(e) => updateRules("max_cancellations_month", Number(e.target.value))}
              className="h-9 w-24 text-right"
            />
          }
        />
        <FieldRow
          label="Cobrar cancelamento tardio"
          control={
            <Switch
              checked={rules.charge_late_cancellation}
              onCheckedChange={(v) => updateRules("charge_late_cancellation", v)}
            />
          }
        />
        {rules.charge_late_cancellation && (
          <FieldRow
            label="Valor da taxa (R$)"
            control={
              <Input
                type="number"
                min={0}
                step={5}
                value={rules.late_cancellation_fee}
                onChange={(e) => updateRules("late_cancellation_fee", Number(e.target.value))}
                className="h-9 w-28 text-right"
              />
            }
          />
        )}
      </SectionCard>

      <SectionCard
        icon={<CalendarRange className="h-4 w-4" />}
        title="Janela de Agendamento"
        description="Limites para quando pacientes podem agendar"
      >
        <FieldRow
          label="Antecedência mínima (dias)"
          description="Quantos dias antes do horário o paciente precisa agendar (0 = mesmo dia permitido)"
          control={
            <Input
              type="number"
              min={0}
              max={30}
              value={booking.minAdvanceDays}
              onChange={(e) =>
                updateBooking("minAdvanceDays", Math.max(0, Number(e.target.value) || 0))
              }
              className="h-9 w-24 text-right"
            />
          }
        />
        <FieldRow
          label="Antecedência máxima (dias)"
          description="Limite de dias no futuro para criar agendamentos"
          control={
            <Input
              type="number"
              min={1}
              max={365}
              value={booking.maxAdvanceDays}
              onChange={(e) =>
                updateBooking("maxAdvanceDays", Math.max(1, Number(e.target.value) || 1))
              }
              className="h-9 w-24 text-right"
            />
          }
        />
        <FieldRow
          label="Permitir agendamento no mesmo dia"
          description="Quando desativado, ignora o limite mínimo apenas para hoje"
          control={
            <Switch
              checked={booking.allowSameDay}
              onCheckedChange={(v) => updateBooking("allowSameDay", v)}
            />
          }
        />
        <FieldRow
          label="Agendamento online pelo paciente"
          description="Habilita o portal de auto-agendamento"
          control={
            <Switch
              checked={booking.allowOnlineBooking}
              onCheckedChange={(v) => updateBooking("allowOnlineBooking", v)}
            />
          }
        />
      </SectionCard>

      <SectionCard
        icon={<UserX className="h-4 w-4" />}
        title="Política de Faltas (No-Show)"
        description="Ação automática quando paciente atinge o limite de faltas"
      >
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldRow
              label="Limite de faltas"
              description="Quantas faltas antes da ação"
              control={
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={noShow.thresholdCount}
                  onChange={(e) =>
                    updateNoShow(
                      "thresholdCount",
                      Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                    )
                  }
                  className="h-9 w-24 text-right"
                />
              }
            />
            <FieldRow
              label="Janela de avaliação (dias)"
              description="Período em que as faltas contam"
              control={
                <Input
                  type="number"
                  min={7}
                  max={365}
                  value={noShow.windowDays}
                  onChange={(e) =>
                    updateNoShow(
                      "windowDays",
                      Math.max(7, Math.min(365, Number(e.target.value) || 7)),
                    )
                  }
                  className="h-9 w-24 text-right"
                />
              }
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ação ao atingir limite
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {NOSHOW_ACTIONS.map((opt) => {
                const active = noShow.action === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateNoShow("action", opt.value)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition",
                      active
                        ? "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-900",
                    )}
                  >
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {noShow.action === "suspend" && (
            <FieldRow
              label="Duração da suspensão (dias)"
              control={
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={noShow.suspendDays}
                  onChange={(e) =>
                    updateNoShow(
                      "suspendDays",
                      Math.max(0, Math.min(365, Number(e.target.value) || 0)),
                    )
                  }
                  className="h-9 w-24 text-right"
                />
              }
            />
          )}

          {noShow.action === "charge" && (
            <div className="space-y-0">
              <FieldRow
                label="Cobrar taxa por falta"
                control={
                  <Switch
                    checked={noShow.chargeFee}
                    onCheckedChange={(v) => updateNoShow("chargeFee", v)}
                  />
                }
              />
              {noShow.chargeFee && (
                <FieldRow
                  label="Valor da taxa (R$)"
                  control={
                    <Input
                      type="number"
                      min={0}
                      step={5}
                      value={noShow.feeAmount}
                      onChange={(e) =>
                        updateNoShow("feeAmount", Math.max(0, Number(e.target.value) || 0))
                      }
                      className="h-9 w-28 text-right"
                    />
                  }
                />
              )}
            </div>
          )}

          <FieldRow
            label="Notificar administradores"
            description="Email para a equipe quando paciente atinge o limite"
            control={
              <Switch
                checked={noShow.notifyAdmin}
                onCheckedChange={(v) => updateNoShow("notifyAdmin", v)}
              />
            }
          />
        </div>
      </SectionCard>
    </div>
  );
}
