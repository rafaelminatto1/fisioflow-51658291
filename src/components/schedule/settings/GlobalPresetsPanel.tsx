/**
 * GlobalPresetsPanel — Grid de presets globais de aparência
 *
 * Reutiliza os 4 presets definidos em ScheduleVisualTab.tsx.
 * Ao selecionar um preset, chama applyToAllViews(preset.config) e exibe
 * confirmação visual por 2 segundos (ícone CheckCircle2).
 *
 * Usa useAgendaAppearancePersistence("day") para acessar applyToAllViews.
 */

import { useState } from "react";
import { Zap, Monitor, SunMedium, Layers, CheckCircle2, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardSize } from "@/types/agenda";
import { useAgendaAppearancePersistence } from "@/hooks/useAgendaAppearancePersistence";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";

// ─── Presets (reused from ScheduleVisualTab) ──────────────────────────────────

interface ViewPreset {
  id: string;
  name: string;
  description: string;
  icon: typeof Zap;
  color: string;
  activeBg: string;
  config: { cardSize: CardSize; heightScale: number; opacity: number };
}

const PRESETS: ViewPreset[] = [
  {
    id: "productive",
    name: "Alta Produtividade",
    description: "Slots compactos",
    icon: Zap,
    color: "text-amber-600 dark:text-amber-400",
    activeBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-400",
    config: { cardSize: "extra_small", heightScale: 2, opacity: 100 },
  },
  {
    id: "balanced",
    name: "Equilíbrio",
    description: "Info e espaço",
    icon: Monitor,
    color: "text-blue-600 dark:text-blue-400",
    activeBg: "bg-blue-50 dark:bg-blue-950/40 border-blue-400",
    config: { cardSize: "medium", heightScale: 5, opacity: 100 },
  },
  {
    id: "comfortable",
    name: "Confortável",
    description: "Mais espaço",
    icon: SunMedium,
    color: "text-teal-600 dark:text-teal-400",
    activeBg: "bg-teal-50 dark:bg-teal-950/40 border-teal-400",
    config: { cardSize: "large", heightScale: 8, opacity: 100 },
  },
  {
    id: "layered",
    name: "Camadas",
    description: "Transparência suave",
    icon: Layers,
    color: "text-sky-600 dark:text-sky-400",
    activeBg: "bg-sky-50 dark:bg-sky-950/40 border-sky-400",
    config: { cardSize: "medium", heightScale: 6, opacity: 60 },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function GlobalPresetsPanel() {
  // Use "day" view to access applyToAllViews (it's shared across all views)
  const { applyToAllViews, appearance } = useAgendaAppearancePersistence("day");
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

  const handleApplyPreset = (preset: ViewPreset) => {
    applyToAllViews(preset.config);
    setAppliedPreset(preset.id);
    setTimeout(() => setAppliedPreset(null), 2000);
  };

  return (
    <SettingsSectionCard
      icon={<Sliders className="h-4 w-4" />}
      iconBg="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
      title="Layouts Rápidos"
      description="Aplique configurações visuais otimizadas a todas as views com um clique"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          const wasApplied = appliedPreset === preset.id;
          // Check if current appearance matches this preset (approximate match)
          const isActive =
            appearance.cardSize === preset.config.cardSize &&
            appearance.heightScale === preset.config.heightScale &&
            appearance.opacity === preset.config.opacity;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className={cn(
                "flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 text-center transition-all duration-200",
                "hover:shadow-sm hover:-translate-y-0.5",
                isActive
                  ? preset.activeBg
                  : "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-all",
                  isActive
                    ? cn(
                        preset.color
                          .replace("text-", "bg-")
                          .replace("-600", "-100")
                          .replace("-400", "-900/40"),
                        preset.color,
                      )
                    : "bg-muted text-muted-foreground",
                )}
              >
                {wasApplied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div>
                <p
                  className={cn(
                    "text-xs font-semibold leading-none",
                    isActive ? preset.color : "",
                  )}
                >
                  {preset.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{preset.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </SettingsSectionCard>
  );
}
