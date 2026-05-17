import { Clock, Gauge, Palette, Stethoscope, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function OverviewTab() {
  const { businessHours, blockedTimes, notificationSettings } = useScheduleSettings();
  const { capacityGroups, capacities } = useScheduleCapacity();
  const { allStatusRows } = useStatusConfig();
  const { types } = useAppointmentTypes();
  const [, setSearchParams] = useSearchParams();
  const goTo = (tab: string) => setSearchParams({ tab }, { replace: true });

  const openDays = businessHours.filter((h) => h.is_open).length;
  const activeStatuses = (allStatusRows ?? []).filter((s) => s.is_active).length;
  const totalSeats = capacities.reduce((sum, c) => sum + c.max_patients, 0);
  const remindersOn =
    !!notificationSettings?.send_reminder_24h || !!notificationSettings?.send_reminder_2h;

  const metrics = [
    { label: "Dias abertos", value: `${openDays}/7`, hint: openDays ? "Expediente configurado" : "Defina horários", icon: Clock, tab: "horarios" },
    { label: "Regras de capacidade", value: capacityGroups.length, hint: `${totalSeats} vagas somadas`, icon: Gauge, tab: "capacidade" },
    { label: "Status ativos", value: activeStatuses, hint: "Disponíveis na agenda", icon: Palette, tab: "status" },
    { label: "Tipos de atendimento", value: types.length, hint: "Serviços cadastrados", icon: Stethoscope, tab: "tipos" },
  ];

  const readiness: Array<{ label: string; ok: boolean; tab: string }> = [
    { label: "Horários de atendimento", ok: openDays > 0, tab: "horarios" },
    { label: "Capacidade por faixa", ok: capacityGroups.length > 0, tab: "capacidade" },
    { label: "Status ativos", ok: activeStatuses > 0, tab: "status" },
    { label: "Lembretes", ok: remindersOn, tab: "politicas" },
    { label: "Bloqueios cadastrados", ok: blockedTimes.length > 0, tab: "bloqueios" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.label}
              type="button"
              onClick={() => goTo(m.tab)}
              className="group text-left"
            >
              <Card className="rounded-lg transition hover:border-teal-300 hover:shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
                  <Icon className="h-4 w-4 text-teal-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold tracking-tight">{m.value}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{m.hint}</p>
                    <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-sm font-semibold tracking-tight">Mapa semanal</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Dias e horários de funcionamento</p>
          <div className="mt-4 space-y-2">
            {businessHours.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Nenhum expediente salvo. Configure na aba Horários.
              </p>
            ) : (
              businessHours.map((h) => (
                <div key={h.day_of_week} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                  <span className="text-xs font-semibold uppercase">{DAY_LABELS[h.day_of_week]}</span>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={cn("h-1.5 rounded-full", h.is_open ? "bg-teal-500" : "bg-transparent")} style={{ width: h.is_open ? "100%" : "0%" }} />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {h.is_open ? `${h.open_time}–${h.close_time}` : "Fechado"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-sm font-semibold tracking-tight">Pronto para uso</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Status de configuração da clínica</p>
          <div className="mt-4 space-y-2">
            {readiness.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => goTo(r.tab)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <span className="text-sm">{r.label}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={r.ok ? "default" : "secondary"}>{r.ok ? "OK" : "Pendente"}</Badge>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
