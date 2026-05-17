import { useState } from "react";
import { Gauge, Plus, Pencil, Trash2, Users, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SectionCard } from "../shared/SectionCard";
import { EmptyState } from "../shared/EmptyState";
import { Stepper } from "../shared/Stepper";
import { cn } from "@/lib/utils";
import { useScheduleCapacity, type CapacityGroup } from "@/hooks/useScheduleCapacity";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HOUR_MIN = 6;
const HOUR_MAX = 22;

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

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
          className="absolute top-0 h-full rounded-full bg-teal-500/70"
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
  return sorted.map((d) => DAY_OPTIONS.find((o) => o.value === d)?.label.toUpperCase() ?? "").join(", ");
}

interface FormState {
  days: number[];
  start_time: string;
  end_time: string;
  max_patients: number;
  appointment_type_id: string | null;
}

const EMPTY_FORM: FormState = {
  days: [],
  start_time: "07:00",
  end_time: "13:00",
  max_patients: 3,
  appointment_type_id: null,
};

export function CapacidadeTab() {
  const {
    capacityGroups,
    capacities,
    isLoading,
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CapacityGroup | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (group: CapacityGroup) => {
    setEditing(group);
    setForm({
      days: [...group.days],
      start_time: group.start_time,
      end_time: group.end_time,
      max_patients: group.max_patients,
      appointment_type_id: group.appointment_type_id,
    });
    setDialogOpen(true);
  };

  const duplicate = (group: CapacityGroup) => {
    setEditing(null);
    setForm({
      days: [],
      start_time: group.start_time,
      end_time: group.end_time,
      max_patients: group.max_patients,
      appointment_type_id: group.appointment_type_id,
    });
    setDialogOpen(true);
  };

  const toggleDay = (d: number) => {
    setForm((p) => ({ ...p, days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d] }));
  };

  const conflicts = checkConflicts(form.days, form.start_time, form.end_time, editing?.ids);
  const isValid = form.days.length > 0 && form.start_time < form.end_time && form.max_patients > 0;
  const canSubmit = isValid && (!conflicts.hasConflict || !!editing);

  const handleSave = () => {
    const payloads = form.days.map((d) => ({
      day_of_week: d,
      start_time: form.start_time,
      end_time: form.end_time,
      max_patients: form.max_patients,
      appointment_type_id: form.appointment_type_id,
    }));

    if (editing) {
      replaceCapacityGroup.mutate(
        { ids: editing.ids, formDataArray: payloads },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createMultipleCapacities.mutate(payloads, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = (group: CapacityGroup) => {
    if (confirm(`Remover regra de capacidade ${group.start_time}–${group.end_time}?`)) {
      deleteCapacityGroup(group.ids);
    }
  };

  return (
    <SectionCard
      icon={<Gauge className="h-4 w-4" />}
      title="Capacidade por Horário"
      description="Vagas máximas por faixa horária. Regras com mesmo horário e capacidade são agrupadas."
      action={
        <Button size="sm" onClick={openCreate} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="mr-2 h-3.5 w-3.5" />
          Nova regra
        </Button>
      }
    >
      {isLoading ? (
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
            <Button size="sm" onClick={openCreate} className="bg-teal-600 hover:bg-teal-700">
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">
                      {group.start_time}–{group.end_time}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
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
                    {group.max_patients} {group.max_patients === 1 ? "paciente" : "pacientes"} por horário · {group.days.length} {group.days.length === 1 ? "dia" : "dias"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicate(group)} title="Duplicar">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(group)} title="Editar">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                  onClick={() => handleDelete(group)}
                  disabled={isDeleting}
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </article>
          ))}
          {capacities.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-teal-100 bg-teal-50/60 px-4 py-2.5 dark:border-teal-900/40 dark:bg-teal-950/30">
              <p className="text-[11px] font-medium text-teal-900 dark:text-teal-100">
                {capacityGroups.length} {capacityGroups.length === 1 ? "regra agrupada" : "regras agrupadas"} ·{" "}
                {capacities.length} {capacities.length === 1 ? "configuração" : "configurações"} ativas
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                {capacities.reduce((s, c) => s + c.max_patients, 0)} vagas totais/semana
              </p>
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar regra de capacidade" : "Nova regra de capacidade"}</DialogTitle>
            <DialogDescription>
              Defina os dias, a faixa horária e a quantidade máxima de pacientes por horário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dias</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAY_OPTIONS.map((d) => {
                  const selected = form.days.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={cn(
                        "h-9 min-w-[3rem] rounded-md border px-3 text-xs font-semibold uppercase tracking-wider transition",
                        selected
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Faixa horária</Label>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                  className="h-9 w-32"
                />
                <span className="text-sm text-muted-foreground">até</span>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                  className="h-9 w-32"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, start_time: p.start, end_time: p.end }))}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {p.label} · {p.start}–{p.end}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pacientes por horário</Label>
              <div className="mt-2 flex items-center gap-4">
                <Stepper
                  value={form.max_patients}
                  min={1}
                  max={20}
                  onChange={(v) => setForm((p) => ({ ...p, max_patients: v }))}
                />
                <span className="text-xs text-muted-foreground">
                  Máximo de pacientes atendidos simultaneamente nesta faixa
                </span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de atendimento</Label>
              <Select
                value={form.appointment_type_id ?? "__all__"}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, appointment_type_id: v === "__all__" ? null : v }))
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
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
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
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canSubmit || isCreating || isReplacing}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isCreating || isReplacing ? "Salvando…" : editing ? "Salvar alterações" : "Criar regra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
