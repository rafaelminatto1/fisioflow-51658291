import { useEffect, useMemo, useState } from "react";
import { Clock, Coffee, Copy, Gauge, Plus, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/schedule/settings-v2/shared/SectionCard";
import { EmptyState } from "@/components/schedule/settings-v2/shared/EmptyState";
import { Stepper } from "@/components/schedule/settings-v2/shared/Stepper";
import { useScheduleSettings, type BusinessHour } from "@/hooks/useScheduleSettings";
import { useScheduleCapacity, type CapacityGroup } from "@/hooks/useScheduleCapacity";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import { useTabDirtyState } from "../useTabDirtyState";
import { cn } from "@/lib/utils";
import type { TabComponentProps } from "../types";

const DAYS = [
  { value: 1, label: "Segunda-feira", short: "SEG" },
  { value: 2, label: "Terça-feira", short: "TER" },
  { value: 3, label: "Quarta-feira", short: "QUA" },
  { value: 4, label: "Quinta-feira", short: "QUI" },
  { value: 5, label: "Sexta-feira", short: "SEX" },
  { value: 6, label: "Sábado", short: "SÁB" },
  { value: 0, label: "Domingo", short: "DOM" },
];

type Draft = Partial<BusinessHour> & { day_of_week: number; hasBreak?: boolean };
type DraftMap = Record<number, Draft>;

function emptyDraft(): DraftMap {
  const map: DraftMap = {};
  for (const d of DAYS) {
    map[d.value] = {
      day_of_week: d.value,
      is_open: false,
      open_time: "07:00",
      close_time: "19:00",
      hasBreak: false,
    };
  }
  return map;
}

const HOUR_MIN = 6;
const HOUR_MAX = 22;

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const WEEK_DAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

const DAY_OPTIONS = [
  { value: 1, label: "Seg", full: "Segunda" },
  { value: 2, label: "Ter", full: "Terça" },
  { value: 3, label: "Qua", full: "Quarta" },
  { value: 4, label: "Qui", full: "Quinta" },
  { value: 5, label: "Sex", full: "Sexta" },
  { value: 6, label: "Sáb", full: "Sábado" },
  { value: 0, label: "Dom", full: "Domingo" },
];

const PRESETS = [
  { label: "Manhã", start: "07:00", end: "12:00" },
  { label: "Tarde", start: "13:00", end: "18:00" },
  { label: "Integral", start: "07:00", end: "19:00" },
];

function badgeForDays(days: number[]): string {
  if (days.length === 0) return "";
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 5 && sorted[0] === 1 && sorted[4] === 5) return "SEG–SEX";
  if (sorted.length === 6 && sorted[0] === 1 && sorted[5] === 6) return "SEG–SÁB";
  if (sorted.length === 7) return "TODOS";
  return sorted
    .map((d) => DAY_OPTIONS.find((o) => o.value === d)?.label.toUpperCase() ?? "")
    .join(", ");
}

interface CapacityForm {
  days: number[];
  start_time: string;
  end_time: string;
  max_patients: number;
  appointment_type_id: string | null;
}

const EMPTY_CAP_FORM: CapacityForm = {
  days: [],
  start_time: "07:00",
  end_time: "13:00",
  max_patients: 3,
  appointment_type_id: null,
};

function CoverageBar({ groups, day }: { groups: CapacityGroup[]; day: number }) {
  const totalMin = (HOUR_MAX - HOUR_MIN) * 60;
  const segments = groups
    .filter((g) => g.days.includes(day))
    .map((g) => ({
      start: Math.max(0, toMinutes(g.start_time) - HOUR_MIN * 60),
      end: Math.min(totalMin, toMinutes(g.end_time) - HOUR_MIN * 60),
      max: g.max_patients,
    }))
    .filter((s) => s.end > s.start);

  if (segments.length === 0) {
    return <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800" />;
  }
  return (
    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      {segments.map((s, i) => (
        <div
          key={i}
          className="absolute top-0 h-full rounded-full bg-blue-500/70"
          style={{
            left: `${(s.start / totalMin) * 100}%`,
            width: `${((s.end - s.start) / totalMin) * 100}%`,
          }}
          title={`${s.max} pacientes`}
        />
      ))}
    </div>
  );
}

export function FuncionamentoTab({ registerHandle }: TabComponentProps) {
  const { businessHours, isLoadingHours, upsertBusinessHours, isSavingHours } =
    useScheduleSettings();
  const { value: draft, setValue, isDirty, reset } = useTabDirtyState(emptyDraft());
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (businessHours.length === 0) return;
    const map = emptyDraft();
    for (const h of businessHours) {
      map[h.day_of_week] = { ...h, hasBreak: !!(h.break_start && h.break_end) };
    }
    reset(map);
  }, [businessHours, reset]);

  const update = (day: number, patch: Partial<Draft>) => {
    setValue((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  const copyToAll = (sourceDay: number) => {
    const source = draft[sourceDay];
    setValue((prev) => {
      const next: DraftMap = { ...prev };
      for (const d of DAYS) {
        if (d.value === sourceDay) continue;
        next[d.value] = {
          ...next[d.value],
          is_open: source.is_open,
          open_time: source.open_time,
          close_time: source.close_time,
          break_start: source.hasBreak ? source.break_start : undefined,
          break_end: source.hasBreak ? source.break_end : undefined,
          hasBreak: source.hasBreak,
        };
      }
      return next;
    });
  };

  const save = useMemo(
    () => () => {
      const list = DAYS.map((d) => {
        const row = draft[d.value];
        return {
          id: row.id,
          day_of_week: d.value,
          is_open: !!row.is_open,
          open_time: row.open_time ?? "07:00",
          close_time: row.close_time ?? "19:00",
          break_start: row.hasBreak ? row.break_start : undefined,
          break_end: row.hasBreak ? row.break_end : undefined,
        } satisfies Partial<BusinessHour>;
      });
      upsertBusinessHours.mutate(list, {
        onSuccess: () => {
          reset(draft);
          setLastSavedAt(new Date());
        },
      });
    },
    [draft, upsertBusinessHours, reset],
  );

  useEffect(() => {
    registerHandle({ isDirty, isSaving: isSavingHours, lastSavedAt, save, discard: () => reset() });
    return () => registerHandle(null);
  }, [isDirty, isSavingHours, lastSavedAt, save, reset, registerHandle]);

  const {
    capacityGroups,
    capacities,
    isLoading: isLoadingCap,
    createMultipleCapacities,
    replaceCapacityGroup,
    deleteCapacityGroup,
    checkConflicts,
    isCreating,
    isReplacing,
    isDeleting,
  } = useScheduleCapacity();
  const { types } = useAppointmentTypes();
  const typeById = new Map(types.map((t) => [t.id, t] as const));

  const [capDialogOpen, setCapDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CapacityGroup | null>(null);
  const [capForm, setCapForm] = useState<CapacityForm>(EMPTY_CAP_FORM);

  const openCreate = () => {
    setEditing(null);
    setCapForm(EMPTY_CAP_FORM);
    setCapDialogOpen(true);
  };

  const openEdit = (group: CapacityGroup) => {
    setEditing(group);
    setCapForm({
      days: [...group.days],
      start_time: group.start_time,
      end_time: group.end_time,
      max_patients: group.max_patients,
      appointment_type_id: group.appointment_type_id,
    });
    setCapDialogOpen(true);
  };

  const duplicate = (group: CapacityGroup) => {
    setEditing(null);
    setCapForm({
      days: [],
      start_time: group.start_time,
      end_time: group.end_time,
      max_patients: group.max_patients,
      appointment_type_id: group.appointment_type_id,
    });
    setCapDialogOpen(true);
  };

  const toggleCapDay = (d: number) => {
    setCapForm((p) => ({
      ...p,
      days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d],
    }));
  };

  const conflicts = checkConflicts(capForm.days, capForm.start_time, capForm.end_time, editing?.ids);
  const isValid = capForm.days.length > 0 && capForm.start_time < capForm.end_time && capForm.max_patients > 0;
  const canSubmit = isValid && (!conflicts.hasConflict || !!editing);

  const handleCapSave = () => {
    const payloads = capForm.days.map((d) => ({
      day_of_week: d,
      start_time: capForm.start_time,
      end_time: capForm.end_time,
      max_patients: capForm.max_patients,
      appointment_type_id: capForm.appointment_type_id,
    }));

    if (editing) {
      replaceCapacityGroup.mutate(
        { ids: editing.ids, formDataArray: payloads },
        { onSuccess: () => setCapDialogOpen(false) },
      );
    } else {
      createMultipleCapacities.mutate(payloads, { onSuccess: () => setCapDialogOpen(false) });
    }
  };

  const handleCapDelete = (group: CapacityGroup) => {
    if (confirm(`Remover regra de capacidade ${group.start_time}–${group.end_time}?`)) {
      deleteCapacityGroup(group.ids);
    }
  };

  return (
    <div className="space-y-5">
      <SectionCard
        icon={<Clock className="h-4 w-4" />}
        title="Horários de Funcionamento"
        description="Defina os dias, horários e pausas da clínica"
      >
        {isLoadingHours ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {DAYS.map((day) => {
              const row = draft[day.value];
              return (
                <div
                  key={day.value}
                  className="rounded-lg border border-slate-100 px-4 py-3 dark:border-slate-800"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex min-w-[10rem] items-center gap-3">
                      <Switch
                        checked={!!row.is_open}
                        onCheckedChange={(v) => update(day.value, { is_open: v })}
                      />
                      <span className="text-sm font-medium">{day.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={row.open_time ?? "07:00"}
                        disabled={!row.is_open}
                        onChange={(e) => update(day.value, { open_time: e.target.value })}
                        className="h-9 w-28"
                      />
                      <span className="text-xs text-muted-foreground">até</span>
                      <Input
                        type="time"
                        value={row.close_time ?? "19:00"}
                        disabled={!row.is_open}
                        onChange={(e) => update(day.value, { close_time: e.target.value })}
                        className="h-9 w-28"
                      />
                    </div>

                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!row.is_open}
                        onClick={() =>
                          update(day.value, {
                            hasBreak: !row.hasBreak,
                            break_start: row.break_start ?? "12:00",
                            break_end: row.break_end ?? "13:00",
                          })
                        }
                        className={row.hasBreak ? "text-blue-700" : "text-muted-foreground"}
                      >
                        <Coffee className="mr-1 h-3.5 w-3.5" />
                        {row.hasBreak ? "Pausa" : "Sem pausa"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToAll(day.value)}
                        title="Copiar este horário para todos os dias"
                        className="text-muted-foreground"
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        Copiar
                      </Button>
                    </div>
                  </div>

                  {row.is_open && row.hasBreak && (
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <span className="text-xs font-medium text-muted-foreground">Pausa</span>
                      <Input
                        type="time"
                        value={row.break_start ?? "12:00"}
                        onChange={(e) => update(day.value, { break_start: e.target.value })}
                        className="h-8 w-28"
                      />
                      <span className="text-xs text-muted-foreground">até</span>
                      <Input
                        type="time"
                        value={row.break_end ?? "13:00"}
                        onChange={(e) => update(day.value, { break_end: e.target.value })}
                        className="h-8 w-28"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={<Gauge className="h-4 w-4" />}
        title="Capacidade por Horário"
        description="Vagas máximas por faixa horária. Regras com mesmo horário e capacidade são agrupadas."
        action={
          <Button size="sm" onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-3.5 w-3.5" />
            Nova regra
          </Button>
        }
      >
        {isLoadingCap ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : capacityGroups.length === 0 ? (
          <EmptyState
            icon={<Gauge className="h-5 w-5" />}
            title="Nenhuma regra cadastrada"
            description="Crie uma regra para definir quantos pacientes podem ser atendidos em cada faixa horária."
            action={
              <Button size="sm" onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-3.5 w-3.5" />
                Criar primeira regra
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Cobertura semanal
                </p>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(HOUR_MIN).padStart(2, "0")}h — {String(HOUR_MAX).padStart(2, "0")}h
                </span>
              </div>
              <div className="space-y-1.5">
                {WEEK_DAYS.map((d) => (
                  <div key={d.value} className="flex items-center gap-3">
                    <span className="w-8 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {d.label}
                    </span>
                    <CoverageBar groups={capacityGroups} day={d.value} />
                  </div>
                ))}
              </div>
            </div>

            {capacityGroups.map((group) => (
              <article
                key={group.ids.join("-")}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold">
                        {group.start_time}–{group.end_time}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold uppercase tracking-wider"
                      >
                        {badgeForDays(group.days)}
                      </Badge>
                      {group.appointment_type_id ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium"
                          style={{
                            borderColor: typeById.get(group.appointment_type_id)?.color ?? undefined,
                            color: typeById.get(group.appointment_type_id)?.color ?? undefined,
                          }}
                        >
                          {typeById.get(group.appointment_type_id)?.name ?? "Tipo"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Todos os tipos
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {group.max_patients} {group.max_patients === 1 ? "paciente" : "pacientes"} por
                      horário · {group.days.length} {group.days.length === 1 ? "dia" : "dias"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => duplicate(group)}
                    title="Duplicar"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openEdit(group)}
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                    onClick={() => handleCapDelete(group)}
                    disabled={isDeleting}
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </article>
            ))}
            {capacities.length > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-2.5 dark:border-blue-900/40 dark:bg-blue-950/30">
                <p className="text-[11px] font-medium text-blue-900 dark:text-blue-100">
                  {capacityGroups.length}{" "}
                  {capacityGroups.length === 1 ? "regra agrupada" : "regras agrupadas"} ·{" "}
                  {capacities.length} {capacities.length === 1 ? "configuração" : "configurações"}{" "}
                  ativas
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  {capacities.reduce((s, c) => s + c.max_patients, 0)} vagas totais/semana
                </p>
              </div>
            )}
          </div>
        )}

        <Dialog open={capDialogOpen} onOpenChange={setCapDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar regra de capacidade" : "Nova regra de capacidade"}
              </DialogTitle>
              <DialogDescription>
                Defina os dias, a faixa horária e a quantidade máxima de pacientes por horário.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dias
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((d) => {
                    const selected = capForm.days.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleCapDay(d.value)}
                        className={cn(
                          "h-9 min-w-[3rem] rounded-md border px-3 text-xs font-semibold uppercase tracking-wider transition",
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Faixa horária
                </Label>
                <div className="mt-2 flex items-center gap-3">
                  <Input
                    type="time"
                    value={capForm.start_time}
                    onChange={(e) => setCapForm((p) => ({ ...p, start_time: e.target.value }))}
                    className="h-9 w-32"
                  />
                  <span className="text-sm text-muted-foreground">até</span>
                  <Input
                    type="time"
                    value={capForm.end_time}
                    onChange={(e) => setCapForm((p) => ({ ...p, end_time: e.target.value }))}
                    className="h-9 w-32"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        setCapForm((prev) => ({ ...prev, start_time: p.start, end_time: p.end }))
                      }
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      {p.label} · {p.start}–{p.end}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pacientes por horário
                </Label>
                <div className="mt-2 flex items-center gap-4">
                  <Stepper
                    value={capForm.max_patients}
                    min={1}
                    max={20}
                    onChange={(v) => setCapForm((p) => ({ ...p, max_patients: v }))}
                  />
                  <span className="text-xs text-muted-foreground">
                    Máximo de pacientes atendidos simultaneamente nesta faixa
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo de atendimento
                </Label>
                <Select
                  value={capForm.appointment_type_id ?? "__all__"}
                  onValueChange={(v) =>
                    setCapForm((p) => ({ ...p, appointment_type_id: v === "__all__" ? null : v }))
                  }
                >
                  <SelectTrigger className="mt-2 h-9">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os tipos (sem filtro)</SelectItem>
                    {types
                      .filter((t) => t.isActive)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: t.color }}
                            />
                            {t.name}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Vazio = vale para qualquer tipo. Específico = só limita esse tipo (ex.: grupo = 4).
                </p>
              </div>

              {conflicts.hasConflict && !editing && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">
                    Existe conflito com {conflicts.conflicts.length} configuração(ões) já criada(s):{" "}
                    {conflicts.conflicts.map((c) => `${c.dayLabel} ${c.start}–${c.end}`).join("; ")}.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setCapDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCapSave}
                disabled={!canSubmit || isCreating || isReplacing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCreating || isReplacing
                  ? "Salvando…"
                  : editing
                    ? "Salvar alterações"
                    : "Criar regra"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SectionCard>
    </div>
  );
}
