import { useEffect, useState } from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/schedule/settings/shared/SectionCard";
import { FieldRow } from "@/components/schedule/settings/shared/FieldRow";
import { cn } from "@/lib/utils";
import { useAgendaAppearancePersistence } from "@/hooks/useAgendaAppearancePersistence";
import type { TabComponentProps } from "../types";

type CardSize = "extra_small" | "small" | "medium" | "large";
type AgendaView = "day" | "week" | "month";

const DENSITY_OPTIONS: Array<{ value: CardSize; label: string; description: string }> = [
  { value: "extra_small", label: "Mínimo", description: "Máxima densidade" },
  { value: "small", label: "Compacto", description: "Vê mais sem rolar" },
  { value: "medium", label: "Balanceado", description: "Padrão recomendado" },
  { value: "large", label: "Espaçoso", description: "Mais respiro visual" },
];

const VIEW_OPTIONS: Array<{ value: AgendaView; label: string }> = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

const AUTO_ADJUST_KEY = "agenda_appearance_auto_adjust";

function proportionalCardSize(scale: number): CardSize {
  if (scale <= 2) return "extra_small";
  if (scale <= 4) return "small";
  if (scale <= 7) return "medium";
  return "large";
}

export function AparenciaTab({ registerHandle }: TabComponentProps) {
  const [activeView, setActiveView] = useState<AgendaView>("week");
  const [autoAdjust, setAutoAdjust] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(AUTO_ADJUST_KEY) !== "false";
  });

  const { appearance, setCardSize, setHeightScale, resetView, resetAll, isSyncing, lastSyncedAt } =
    useAgendaAppearancePersistence(activeView);

  // Aparência salva automaticamente (debounced); o contrato de save fica inerte.
  useEffect(() => {
    registerHandle({
      isDirty: false,
      isSaving: isSyncing,
      lastSavedAt: lastSyncedAt,
      save: () => {},
      discard: () => {},
    });
    return () => registerHandle(null);
  }, [isSyncing, lastSyncedAt, registerHandle]);

  const handleManualCardSize = (size: CardSize) => {
    setCardSize(size);
    setAutoAdjust(false);
    if (typeof window !== "undefined") localStorage.setItem(AUTO_ADJUST_KEY, "false");
  };

  const handleHeightScale = (val: number) => {
    setHeightScale(val);
    if (autoAdjust) {
      const next = proportionalCardSize(val);
      if (appearance.cardSize !== next) setCardSize(next);
    }
  };

  const handleAutoAdjust = (checked: boolean) => {
    setAutoAdjust(checked);
    if (typeof window !== "undefined") localStorage.setItem(AUTO_ADJUST_KEY, String(checked));
    if (checked) {
      const next = proportionalCardSize(appearance.heightScale);
      if (appearance.cardSize !== next) setCardSize(next);
    }
  };

  return (
    <SectionCard
      icon={<SlidersHorizontal className="h-4 w-4" />}
      title="Aparência da Agenda"
      description="Densidade e altura dos cards. As alterações são salvas automaticamente."
      action={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => resetView()}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Restaurar visão
          </Button>
          <Button variant="outline" size="sm" onClick={() => resetAll()}>
            Restaurar tudo
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Visão configurada
          </p>
          <div className="inline-flex rounded-lg border border-slate-200 p-1 dark:border-slate-700">
            {VIEW_OPTIONS.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setActiveView(v.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  activeView === v.value
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <FieldRow
          label="Ajuste automático de densidade"
          description="A densidade dos cards acompanha a altura escolhida"
          control={<Switch checked={autoAdjust} onCheckedChange={handleAutoAdjust} />}
        />

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Densidade dos cards
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DENSITY_OPTIONS.map((opt) => {
              const active = appearance.cardSize === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleManualCardSize(opt.value)}
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

        <FieldRow
          label="Altura dos cards"
          description="Controle fino da altura das linhas de horário"
          control={
            <input
              type="range"
              min={1}
              max={10}
              value={appearance.heightScale}
              onChange={(e) => handleHeightScale(Number(e.target.value))}
              className="w-48 accent-blue-600"
              aria-label="Altura dos cards"
            />
          }
        />
      </div>
    </SectionCard>
  );
}
