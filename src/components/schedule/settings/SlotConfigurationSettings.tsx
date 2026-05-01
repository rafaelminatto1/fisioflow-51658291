import { useState, useCallback, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { Timer, Clock, Users, AlignHorizontalSpaceAround } from "lucide-react";
import { useSlotConfig } from "@/hooks/useSlotConfig";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SlotLocalState {
  defaultDuration: number;
  intervalBetween: number;
  overbookingEnabled: boolean;
  overbookingPercent: number;
  alignmentType: "fixed" | "flexible";
  slotInterval: 15 | 30 | 60;
}

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 horas" },
];

const INTERVAL_OPTIONS = [
  { value: 0, label: "Sem intervalo" },
  { value: 5, label: "5 minutos" },
  { value: 10, label: "10 minutos" },
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
];

/**
 * SlotConfigurationSettings — Duração, intervalo, overbooking e alinhamento
 *
 * Componente novo para a seção de configuração detalhada de slots
 * dentro da tab "Capacidade & Horários".
 */
export function SlotConfigurationSettings() {
  const { data: remote, save, isSaving } = useSlotConfig();

  const [state, setState] = useState<SlotLocalState>({
    defaultDuration: 30,
    intervalBetween: 0,
    overbookingEnabled: false,
    overbookingPercent: 10,
    alignmentType: "fixed",
    slotInterval: remote.slotInterval,
  });

  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) {
      setState((prev) => ({ ...prev, slotInterval: remote.slotInterval }));
    }
  }, [remote, dirty]);

  const update = useCallback(
    <K extends keyof SlotLocalState>(key: K, value: SlotLocalState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
    },
    [],
  );

  const handleSave = useCallback(() => {
    save({
      slotInterval: state.slotInterval,
      alignmentType: state.alignmentType,
    });
    setDirty(false);
  }, [state, save]);

  return (
    <SettingsSectionCard
      icon={<Timer className="h-4 w-4" />}
      iconBg="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400"
      title="Configurações de Slots"
      description="Duração padrão, intervalos e regras de horários"
    >
      <div className="space-y-6">
        {/* Row 1: Duration + Interval */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Duração padrão do slot
            </Label>
            <Select
              value={String(state.defaultDuration)}
              onValueChange={(v) => update("defaultDuration", parseInt(v, 10))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Tempo padrão para consultas ao criar novos agendamentos
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
              Intervalo entre atendimentos
            </Label>
            <Select
              value={String(state.intervalBetween)}
              onValueChange={(v) => update("intervalBetween", parseInt(v, 10))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Buffer entre um paciente e outro (preparação de sala)
            </p>
          </div>
        </div>

        {/* Overbooking */}
        <div className="pt-4 border-t space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Tolerância de Overbooking
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Permite agendar além da capacidade máxima por horário
              </p>
            </div>
            <Switch
              checked={state.overbookingEnabled}
              onCheckedChange={(v) => update("overbookingEnabled", v)}
            />
          </div>

          {state.overbookingEnabled && (
            <div className="ml-0 flex items-center gap-3 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
              <Label className="text-sm font-medium shrink-0">Tolerância:</Label>
              <input
                type="number"
                min={5}
                max={50}
                value={state.overbookingPercent}
                onChange={(e) => update("overbookingPercent", parseInt(e.target.value, 10))}
                className="w-16 h-8 px-2 rounded-lg border bg-background text-sm font-mono text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Excedentes aparecem destacados no calendário
              </p>
            </div>
          )}
        </div>

        {/* Alignment */}
        <div className="pt-4 border-t space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <AlignHorizontalSpaceAround className="h-3.5 w-3.5 text-muted-foreground" />
            Alinhamento de Horários
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "fixed" as const,
                label: "Fixo",
                desc: `A cada ${state.slotInterval} minutos`,
              },
              {
                value: "flexible" as const,
                label: "Flexível",
                desc: "Qualquer horário disponível",
              },
            ].map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  state.alignmentType === opt.value
                    ? "border-teal-400 bg-teal-50/50 dark:bg-teal-950/30"
                    : "border-border hover:bg-muted/30",
                )}
              >
                <input
                  type="radio"
                  name="alignment-type"
                  checked={state.alignmentType === opt.value}
                  onChange={() => update("alignmentType", opt.value)}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {dirty && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        )}
      </div>
    </SettingsSectionCard>
  );
}
