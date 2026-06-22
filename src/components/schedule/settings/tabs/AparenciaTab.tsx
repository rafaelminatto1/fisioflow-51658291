import { useState } from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/schedule/settings/shared/SectionCard";
import { FieldRow } from "@/components/schedule/settings/shared/FieldRow";
import { cn } from "@/lib/utils";
import { useAgendaAppearancePersistence } from "@/hooks/useAgendaAppearancePersistence";
import { useRegisterTabHandle } from "../useRegisterTabHandle";
import type { TabComponentProps } from "../types";

type CardSize = "extra_small" | "small" | "medium" | "large";

const DENSITY_OPTIONS: Array<{ value: CardSize; label: string; description: string }> = [
  { value: "extra_small", label: "Mínimo", description: "Máxima densidade" },
  { value: "small", label: "Compacto", description: "Vê mais sem rolar" },
  { value: "medium", label: "Balanceado", description: "Padrão recomendado" },
  { value: "large", label: "Espaçoso", description: "Mais respiro visual" },
];

// Altura/fonte aproximada do card por densidade, só para o preview.
const PREVIEW_BY_SIZE: Record<CardSize, { minHeight: number; fontSize: number }> = {
  extra_small: { minHeight: 26, fontSize: 10 },
  small: { minHeight: 34, fontSize: 11 },
  medium: { minHeight: 46, fontSize: 12 },
  large: { minHeight: 64, fontSize: 13 },
};

const PREVIEW_CARDS = [
  { name: "Ana Júlia Dias", time: "08:00" },
  { name: "Carlos Eduardo", time: "09:00" },
  { name: "Marina Tokarevicz", time: "10:00" },
];

const AUTO_ADJUST_KEY = "agenda_appearance_auto_adjust";

function proportionalCardSize(scale: number): CardSize {
  if (scale <= 2) return "extra_small";
  if (scale <= 4) return "small";
  if (scale <= 7) return "medium";
  return "large";
}

export function AparenciaTab({ registerHandle }: TabComponentProps) {
  const [autoAdjust, setAutoAdjust] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(AUTO_ADJUST_KEY) !== "false";
  });

  // "week" é a visão canônica (sem preset próprio); as alterações usam
  // applyToAllViews → valem para Dia/Semana/Mês, refletindo na agenda em
  // qualquer visão (comportamento global, igual ao legado useCardSize).
  const { appearance, applyToAllViews, resetAll, isSyncing, lastSyncedAt } =
    useAgendaAppearancePersistence("week");

  // Aparência salva automaticamente (debounced); o contrato de save fica inerte.
  useRegisterTabHandle(registerHandle, {
    isDirty: false,
    isSaving: isSyncing,
    lastSavedAt: lastSyncedAt,
    save: () => {},
    discard: () => {},
  });

  const cardSize = (appearance.cardSize ?? "medium") as CardSize;
  const heightScale = appearance.heightScale ?? 5;

  const handleDensity = (size: CardSize) => {
    setAutoAdjust(false);
    if (typeof window !== "undefined") localStorage.setItem(AUTO_ADJUST_KEY, "false");
    applyToAllViews({ cardSize: size });
  };

  const handleHeightScale = (val: number) => {
    if (autoAdjust) {
      applyToAllViews({ heightScale: val, cardSize: proportionalCardSize(val) });
    } else {
      applyToAllViews({ heightScale: val });
    }
  };

  const handleAutoAdjust = (checked: boolean) => {
    setAutoAdjust(checked);
    if (typeof window !== "undefined") localStorage.setItem(AUTO_ADJUST_KEY, String(checked));
    if (checked) applyToAllViews({ cardSize: proportionalCardSize(heightScale) });
  };

  const handleReset = () => {
    setAutoAdjust(true);
    if (typeof window !== "undefined") localStorage.setItem(AUTO_ADJUST_KEY, "true");
    resetAll();
  };

  const preview = PREVIEW_BY_SIZE[cardSize];

  return (
    <SectionCard
      icon={<SlidersHorizontal className="h-4 w-4" />}
      title="Aparência da Agenda"
      description="Densidade e altura dos cards. Aplica-se a todas as visões e é salvo automaticamente."
      action={
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Restaurar padrões
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-5">
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
                const active = cardSize === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleDensity(opt.value)}
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
                value={heightScale}
                onChange={(e) => handleHeightScale(Number(e.target.value))}
                className="w-48 accent-blue-600"
                aria-label="Altura dos cards"
              />
            }
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pré-visualização
          </p>
          <div className="space-y-1.5">
            {PREVIEW_CARDS.map((c) => (
              <div
                key={c.name}
                className="flex flex-col justify-center rounded-md border border-blue-200 bg-blue-50 px-2 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
                style={{ minHeight: preview.minHeight, fontSize: preview.fontSize }}
              >
                <span className="truncate font-semibold leading-tight">{c.name}</span>
                <span className="opacity-70" style={{ fontSize: preview.fontSize - 1 }}>
                  {c.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
