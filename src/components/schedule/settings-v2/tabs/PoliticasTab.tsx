import { useEffect, useState } from "react";
import { Bell, Shield, Save, CalendarRange, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "../shared/SectionCard";
import { FieldRow } from "../shared/FieldRow";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useBookingWindow, type BookingWindowData } from "@/hooks/useBookingWindow";
import { useNoShowPolicy, type NoShowPolicy, type NoShowAction } from "@/hooks/useNoShowPolicy";
import { cn } from "@/lib/utils";

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

export function PoliticasTab() {
  const {
    cancellationRules,
    notificationSettings,
    upsertCancellationRules,
    upsertNotificationSettings,
    isSavingRules,
    isSavingNotifications,
  } = useScheduleSettings();
  const {
    data: bookingData,
    save: saveBookingWindow,
    isSaving: isSavingBooking,
  } = useBookingWindow();
  const [booking, setBooking] = useState<BookingWindowData>(bookingData);
  const [bookingDirty, setBookingDirty] = useState(false);
  const { data: nsData, save: saveNoShow, isSaving: isSavingNoShow } = useNoShowPolicy();
  const [noShow, setNoShow] = useState<NoShowPolicy>(nsData);
  const [noShowDirty, setNoShowDirty] = useState(false);

  const [notif, setNotif] = useState({
    send_confirmation_email: true,
    send_confirmation_whatsapp: true,
    send_reminder_24h: true,
    send_reminder_2h: false,
    send_cancellation_notice: true,
  });
  const [rules, setRules] = useState({
    min_hours_before: 24,
    allow_patient_cancellation: true,
    max_cancellations_month: 3,
    charge_late_cancellation: false,
    late_cancellation_fee: 0,
  });
  const [notifDirty, setNotifDirty] = useState(false);
  const [rulesDirty, setRulesDirty] = useState(false);

  useEffect(() => {
    if (notificationSettings) {
      setNotif({
        send_confirmation_email: notificationSettings.send_confirmation_email,
        send_confirmation_whatsapp: notificationSettings.send_confirmation_whatsapp,
        send_reminder_24h: notificationSettings.send_reminder_24h,
        send_reminder_2h: notificationSettings.send_reminder_2h,
        send_cancellation_notice: notificationSettings.send_cancellation_notice,
      });
      setNotifDirty(false);
    }
  }, [notificationSettings]);

  useEffect(() => {
    setBooking(bookingData);
    setBookingDirty(false);
  }, [bookingData]);

  useEffect(() => {
    setNoShow(nsData);
    setNoShowDirty(false);
  }, [nsData]);

  const updateBooking = <K extends keyof BookingWindowData>(k: K, v: BookingWindowData[K]) => {
    setBooking((p) => ({ ...p, [k]: v }));
    setBookingDirty(true);
  };

  const updateNoShow = <K extends keyof NoShowPolicy>(k: K, v: NoShowPolicy[K]) => {
    setNoShow((p) => ({ ...p, [k]: v }));
    setNoShowDirty(true);
  };

  useEffect(() => {
    if (cancellationRules) {
      setRules({
        min_hours_before: cancellationRules.min_hours_before,
        allow_patient_cancellation: cancellationRules.allow_patient_cancellation,
        max_cancellations_month: cancellationRules.max_cancellations_month,
        charge_late_cancellation: cancellationRules.charge_late_cancellation,
        late_cancellation_fee: cancellationRules.late_cancellation_fee,
      });
      setRulesDirty(false);
    }
  }, [cancellationRules]);

  const updateNotif = <K extends keyof typeof notif>(k: K, v: (typeof notif)[K]) => {
    setNotif((p) => ({ ...p, [k]: v }));
    setNotifDirty(true);
  };
  const updateRules = <K extends keyof typeof rules>(k: K, v: (typeof rules)[K]) => {
    setRules((p) => ({ ...p, [k]: v }));
    setRulesDirty(true);
  };

  return (
    <div className="space-y-5">
      <SectionCard
        icon={<Bell className="h-4 w-4" />}
        title="Notificações"
        description="Lembretes automáticos por email e WhatsApp"
        action={
          <Button
            size="sm"
            onClick={() =>
              upsertNotificationSettings.mutate(notif, { onSuccess: () => setNotifDirty(false) })
            }
            disabled={!notifDirty || isSavingNotifications}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {isSavingNotifications ? "Salvando…" : "Salvar"}
          </Button>
        }
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
        action={
          <Button
            size="sm"
            onClick={() =>
              upsertCancellationRules.mutate(rules, { onSuccess: () => setRulesDirty(false) })
            }
            disabled={!rulesDirty || isSavingRules}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {isSavingRules ? "Salvando…" : "Salvar"}
          </Button>
        }
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
        action={
          <Button
            size="sm"
            onClick={() => saveBookingWindow(booking)}
            disabled={!bookingDirty || isSavingBooking}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {isSavingBooking ? "Salvando…" : "Salvar"}
          </Button>
        }
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
        action={
          <Button
            size="sm"
            onClick={() => saveNoShow(noShow)}
            disabled={!noShowDirty || isSavingNoShow}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {isSavingNoShow ? "Salvando…" : "Salvar"}
          </Button>
        }
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
                        ? "border-teal-600 bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
                        : "border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/50 dark:border-slate-700 dark:bg-slate-900",
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
