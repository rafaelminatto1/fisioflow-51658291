import { useState } from "react";
import { useScheduleCapacity, type CapacityGroup } from "@/hooks/useScheduleCapacity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Minus, Loader2, CheckCircle2, Info, Copy, Pencil, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = [
  { value: "monday", label: "Segunda", valueNum: 1 },
  { value: "tuesday", label: "Terça", valueNum: 2 },
  { value: "wednesday", label: "Quarta", valueNum: 3 },
  { value: "thursday", label: "Quinta", valueNum: 4 },
  { value: "friday", label: "Sexta", valueNum: 5 },
  { value: "saturday", label: "Sábado", valueNum: 6 },
  { value: "sunday", label: "Domingo", valueNum: 0 },
];

const DAY_SHORT_LABELS: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

function formatDaysLabel(days: number[]): string {
  if (days.length === 0) return "";
  const sorted = [...days].sort((a, b) => a - b);
  const runs: number[][] = [];
  let run: number[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === run[run.length - 1] + 1) run.push(sorted[i]);
    else {
      runs.push(run);
      run = [sorted[i]];
    }
  }
  runs.push(run);
  return runs
    .map((r) =>
      r.length >= 2
        ? `${DAY_SHORT_LABELS[r[0]]} a ${DAY_SHORT_LABELS[r[r.length - 1]]}`
        : DAY_SHORT_LABELS[r[0]],
    )
    .join(", ");
}

const TIME_PRESETS = [
  { label: "Manhã", start: "07:00", end: "12:00", icon: "☀️" },
  { label: "Tarde", start: "13:00", end: "18:00", icon: "🌤️" },
  { label: "Integral", start: "07:00", end: "19:00", icon: "📅" },
];

const CAPACITY_PRESETS = [
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "5", value: 5 },
];

const DAY_NUM_TO_KEY: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};
const DAY_KEY_TO_NUM: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

type FormData = {
  selectedDays: string[];
  start_time: string;
  end_time: string;
  max_patients: number;
};

const EMPTY_FORM: FormData = {
  selectedDays: [],
  start_time: "07:00",
  end_time: "13:00",
  max_patients: 3,
};

/* ---- sub-componente: controle +/- de capacidade ---- */
function CapacityControl({
  value,
  onChange,
  id,
  size = "sm",
}: {
  value: number;
  onChange: (v: number) => void;
  id?: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const inputW = size === "sm" ? "w-10 h-7" : "w-12 h-8";
  return (
    <div className="flex items-center border rounded-lg bg-background overflow-hidden">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn(h, "rounded-none shrink-0")}
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Diminuir"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        id={id}
        type="number"
        min={1}
        max={20}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!Number.isNaN(v)) onChange(Math.min(20, Math.max(1, v)));
        }}
        className={cn(
          inputW,
          "text-center border-0 rounded-none text-sm font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        )}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn(h, "rounded-none shrink-0")}
        onClick={() => onChange(Math.min(20, value + 1))}
        disabled={value >= 20}
        aria-label="Aumentar"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

/* ---- sub-componente: formulário add/edit ---- */
function CapacityForm({
  title,
  form,
  onChange,
  onSave,
  onCancel,
  isSaving,
  groupKey,
}: {
  title: string;
  form: FormData;
  onChange: (f: FormData) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  groupKey?: string;
}) {
  const prefix = groupKey ?? "new";
  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Presets de horário */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Preset de horário</Label>
        <div className="flex gap-2">
          {TIME_PRESETS.map((p) => (
            <Button
              key={p.label}
              size="sm"
              variant={
                form.start_time === p.start && form.end_time === p.end ? "default" : "outline"
              }
              onClick={() => onChange({ ...form, start_time: p.start, end_time: p.end })}
              className="h-8 text-xs gap-1"
            >
              {p.icon} {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Horários */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Início</Label>
          <Input
            type="time"
            value={form.start_time}
            onChange={(e) => onChange({ ...form, start_time: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Fim</Label>
          <Input
            type="time"
            value={form.end_time}
            onChange={(e) => onChange({ ...form, end_time: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Dias */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Dias da semana</Label>
        <div className="grid grid-cols-4 gap-x-3 gap-y-2">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day.value} className="flex items-center gap-1.5">
              <Checkbox
                id={`${prefix}-${day.value}`}
                checked={form.selectedDays.includes(day.value)}
                onCheckedChange={(checked) =>
                  onChange({
                    ...form,
                    selectedDays: checked
                      ? [...form.selectedDays, day.value]
                      : form.selectedDays.filter((x) => x !== day.value),
                  })
                }
              />
              <Label
                htmlFor={`${prefix}-${day.value}`}
                className="text-xs font-normal cursor-pointer"
              >
                {day.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Capacidade */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Pacientes por horário</Label>
        <div className="flex items-center gap-2 flex-wrap">
          <CapacityControl
            value={form.max_patients}
            onChange={(v) => onChange({ ...form, max_patients: v })}
            size="md"
          />
          <div className="flex gap-1">
            {CAPACITY_PRESETS.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={form.max_patients === p.value ? "default" : "outline"}
                onClick={() => onChange({ ...form, max_patients: p.value })}
                className="h-8 w-8 p-0 text-xs"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-none">
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || form.selectedDays.length === 0}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Salvar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ---- componente principal ---- */
export function ScheduleCapacityManager() {
  const {
    capacities,
    capacityGroups,
    isLoading,
    createMultipleCapacities,
    updateCapacityGroup,
    replaceCapacityGroup,
    deleteCapacityGroup,
    organizationId,
    isCreating,
    isReplacing,
    checkConflicts,
    authError,
  } = useScheduleCapacity();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CapacityGroup | null>(null);
  const [editData, setEditData] = useState<FormData>(EMPTY_FORM);
  const [editingCapacityValue, setEditingCapacityValue] = useState<Record<string, number>>({});
  const [newCapacity, setNewCapacity] = useState<FormData>(EMPTY_FORM);

  const handleAdd = async () => {
    if (!organizationId) {
      toast({ title: "Erro", description: "Organização não carregada.", variant: "destructive" });
      return;
    }
    if (newCapacity.selectedDays.length === 0) {
      toast({ title: "Erro", description: "Selecione pelo menos um dia.", variant: "destructive" });
      return;
    }
    const [sh, sm] = newCapacity.start_time.split(":").map(Number);
    const [eh, em] = newCapacity.end_time.split(":").map(Number);
    if (sh * 60 + sm >= eh * 60 + em) {
      toast({
        title: "Erro",
        description: "Início deve ser anterior ao fim.",
        variant: "destructive",
      });
      return;
    }
    const daysNums = newCapacity.selectedDays.map((d) => DAY_KEY_TO_NUM[d]);
    const conflict = checkConflicts(daysNums, newCapacity.start_time, newCapacity.end_time);
    if (conflict.hasConflict) {
      toast({
        title: "Conflito detectado",
        description: `Sobreposição: ${conflict.conflicts.map((c) => `${c.dayLabel} (${c.start}–${c.end})`).join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    try {
      await createMultipleCapacities.mutateAsync(
        daysNums.map((day) => ({
          day_of_week: day,
          start_time: newCapacity.start_time,
          end_time: newCapacity.end_time,
          max_patients: newCapacity.max_patients,
        })),
      );
      setIsAdding(false);
      setNewCapacity(EMPTY_FORM);
    } catch {
      /* toast já disparado no hook */
    }
  };

  const handleUpdateGroup = (group: CapacityGroup, max_patients: number) => {
    updateCapacityGroup({ ids: group.ids, max_patients });
  };

  const handleDeleteGroup = (group: CapacityGroup) => deleteCapacityGroup(group.ids);

  const handleDuplicate = (group: CapacityGroup) => {
    setNewCapacity({
      selectedDays: [],
      start_time: group.start_time.slice(0, 5),
      end_time: group.end_time.slice(0, 5),
      max_patients: group.max_patients,
    });
    setEditingGroup(null);
    setIsAdding(true);
  };

  const handleEditStart = (group: CapacityGroup) => {
    setEditData({
      selectedDays: group.days.map((d) => DAY_NUM_TO_KEY[d]),
      start_time: group.start_time.slice(0, 5),
      end_time: group.end_time.slice(0, 5),
      max_patients: group.max_patients,
    });
    setEditingGroup(group);
    setIsAdding(false);
  };

  const handleEditSave = async () => {
    if (!editingGroup) return;
    if (editData.selectedDays.length === 0) {
      toast({ title: "Erro", description: "Selecione pelo menos um dia.", variant: "destructive" });
      return;
    }
    const [sh, sm] = editData.start_time.split(":").map(Number);
    const [eh, em] = editData.end_time.split(":").map(Number);
    if (sh * 60 + sm >= eh * 60 + em) {
      toast({
        title: "Erro",
        description: "Início deve ser anterior ao fim.",
        variant: "destructive",
      });
      return;
    }
    const daysNums = editData.selectedDays.map((d) => DAY_KEY_TO_NUM[d]);
    const conflict = checkConflicts(
      daysNums,
      editData.start_time,
      editData.end_time,
      editingGroup.ids,
    );
    if (conflict.hasConflict) {
      toast({
        title: "Conflito detectado",
        description: `Sobreposição: ${conflict.conflicts.map((c) => `${c.dayLabel} (${c.start}–${c.end})`).join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    try {
      await replaceCapacityGroup.mutateAsync({
        ids: editingGroup.ids,
        formDataArray: daysNums.map((day) => ({
          day_of_week: day,
          start_time: editData.start_time,
          end_time: editData.end_time,
          max_patients: editData.max_patients,
        })),
      });
      setEditingGroup(null);
    } catch {
      /* toast já disparado no hook */
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalSlots = capacities.reduce((sum, cap) => sum + cap.max_patients, 0);
  const unconfiguredDays = DAYS_OF_WEEK.filter(
    (day) => !capacities.some((c) => c.day_of_week === day.valueNum),
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Capacidade da Agenda</p>
          <p className="text-xs text-muted-foreground">Pacientes por horário em cada período</p>
        </div>
        <Badge variant="secondary" className="text-xs font-semibold">
          {totalSlots} vagas/dia
        </Badge>
      </div>

      {authError && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Erro de Autenticação</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}

      {/* Lista de grupos */}
      <div className="space-y-1.5">
        {capacityGroups.map((group, index) => {
          const groupKey = group.ids.join(",");
          const displayValue = editingCapacityValue[groupKey] ?? group.max_patients;
          const isThisEditing = editingGroup?.ids.join(",") === groupKey;

          // cor do indicador por nível
          const dotColor =
            group.max_patients <= 2
              ? "bg-emerald-500"
              : group.max_patients <= 4
                ? "bg-amber-500"
                : "bg-rose-500";

          return (
            <div key={groupKey}>
              <div
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors",
                  isThisEditing
                    ? "border-primary/40 bg-primary/5"
                    : "bg-muted/20 hover:bg-muted/40",
                )}
              >
                {/* Indicador + info */}
                <div className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {formatDaysLabel(group.days)}
                    <span className="text-muted-foreground ml-1.5 font-mono">
                      {group.start_time.slice(0, 5)}–{group.end_time.slice(0, 5)}
                    </span>
                  </p>
                </div>

                {/* Controle de capacidade inline */}
                <CapacityControl
                  id={`cap-${groupKey}`}
                  value={displayValue}
                  onChange={(v) => {
                    setEditingCapacityValue((prev) => ({ ...prev, [groupKey]: v }));
                    handleUpdateGroup(group, v);
                  }}
                  size="sm"
                />
                <span className="text-xs text-muted-foreground w-12 shrink-0">
                  vaga{displayValue !== 1 ? "s" : ""}
                </span>

                {/* Ações — visíveis no hover */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 hover:text-primary"
                    onClick={() => handleDuplicate(group)}
                    title="Duplicar"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-7 w-7",
                      isThisEditing ? "text-primary" : "hover:text-amber-600",
                    )}
                    onClick={() => (isThisEditing ? setEditingGroup(null) : handleEditStart(group))}
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 hover:text-red-500"
                    onClick={() => handleDeleteGroup(group)}
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Formulário de edição inline */}
              {isThisEditing && (
                <div className="mt-1.5 ml-3">
                  <CapacityForm
                    title={`Editar configuração ${index + 1}`}
                    form={editData}
                    onChange={setEditData}
                    onSave={handleEditSave}
                    onCancel={() => setEditingGroup(null)}
                    isSaving={isReplacing}
                    groupKey={groupKey}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dias sem configuração */}
      {unconfiguredDays.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-1">
          <span className="text-xs text-muted-foreground">Dias sem configuração:</span>
          {unconfiguredDays.map((day) => (
            <Badge
              key={day.value}
              variant="outline"
              className="text-xs font-normal text-muted-foreground"
            >
              {day.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Formulário de adicionar / botão */}
      {isAdding ? (
        <CapacityForm
          title="Nova configuração"
          form={newCapacity}
          onChange={setNewCapacity}
          onSave={handleAdd}
          onCancel={() => {
            setIsAdding(false);
            setNewCapacity(EMPTY_FORM);
          }}
          isSaving={isCreating}
        />
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Adicionar Configuração
        </Button>
      )}
    </div>
  );
}
