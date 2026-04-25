import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { AlignHorizontalSpaceAround } from "lucide-react";
import { useSlotConfig } from "@/hooks/useSlotConfig";
import { cn } from "@/lib/utils";

interface SlotAlignmentLocalState {
  slotInterval: 15 | 30 | 60;
  roundToNextSlot: boolean;
}

const SLOT_OPTIONS: { value: 15 | 30 | 60; label: string }[] = [
  { value: 15, label: "A cada 15 minutos" },
  { value: 30, label: "A cada 30 minutos" },
  { value: 60, label: "A cada 1 hora" },
];

function MiniTimeline({ interval }: { interval: number }) {
  const slots: string[] = [];
  const startHour = 7;
  const count = Math.min(Math.floor(60 / interval) + 1, 5);
  for (let i = 0; i < count; i++) {
    const mins = startHour * 60 + i * interval;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }

  return (
    <div className="bg-muted/50 p-4 rounded-lg border border-border/30">
      <div className="flex items-center justify-between text-muted-foreground font-mono text-xs">
        {slots.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <span>{s}</span>
            </div>
            {i < slots.length - 1 && <div className="h-px bg-border/50 flex-1 mx-2" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SlotAlignmentSettings() {
  const { data: remote, save, isSaving } = useSlotConfig();

  const [state, setState] = useState<SlotAlignmentLocalState>({
    slotInterval: remote.slotInterval,
    roundToNextSlot: false,
  });

  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) {
      setState({ slotInterval: remote.slotInterval, roundToNextSlot: false });
    }
  }, [remote, dirty]);

  const update = useCallback(
    <K extends keyof SlotAlignmentLocalState>(key: K, value: SlotAlignmentLocalState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
    },
    [],
  );

  const handleSave = useCallback(() => {
    save({
      slotInterval: state.slotInterval,
      alignmentType: state.roundToNextSlot ? "round" : "fixed",
    });
    setDirty(false);
  }, [state, save]);

  return (
    <SettingsSectionCard
      icon={<AlignHorizontalSpaceAround className="h-4 w-4" />}
      iconBg="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400"
      title="Alinhamento de Slots"
      description="Como os horários são distribuídos"
    >
      <div className="space-y-5">
        <div className="space-y-3">
          {SLOT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all",
                state.slotInterval === opt.value
                  ? "border-teal-400 bg-teal-50/50 dark:bg-teal-950/30"
                  : "border-transparent hover:bg-muted/30",
              )}
            >
              <input
                type="radio"
                name="slot-interval"
                checked={state.slotInterval === opt.value}
                onChange={() => update("slotInterval", opt.value)}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm font-medium">{opt.label}</span>
            </label>
          ))}
        </div>

        <MiniTimeline interval={state.slotInterval} />

        <div className="flex items-center gap-3 pt-2">
          <Switch
            id="round-next-slot"
            checked={state.roundToNextSlot}
            onCheckedChange={(v) => update("roundToNextSlot", v)}
          />
          <Label htmlFor="round-next-slot" className="text-sm font-medium cursor-pointer">
            Arredondar para o próximo slot disponível
          </Label>
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
