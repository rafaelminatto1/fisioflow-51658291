/**
 * ViewAppearancePanel — Painel de configuração de aparência para uma view específica
 *
 * Usa useAgendaAppearancePersistence(view) internamente para ler/escrever
 * apenas o override daquela view. Exibe sliders, selector de cardSize,
 * indicador de override ativo, botões de ação e LiveViewPreview embutido.
 */

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  RotateCcw,
  Copy,
  CheckCircle2,
  Minimize,
  Square,
  Frame,
  Maximize,
  Clock,
  Type,
  Layers,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgendaView } from "@/hooks/useAgendaAppearance";
import type { CardSize } from "@/types/agenda";
import { useAgendaAppearancePersistence } from "@/hooks/useAgendaAppearancePersistence";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { LiveViewPreview } from "@/components/schedule/settings/LiveViewPreview";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ViewAppearancePanelProps {
  view: AgendaView;
  label: string;
  icon: LucideIcon;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_SIZE_OPTIONS: { value: CardSize; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { value: "extra_small", label: "Extra Pequeno", shortLabel: "XS", icon: Minimize },
  { value: "small", label: "Pequeno", shortLabel: "P", icon: Square },
  { value: "medium", label: "Médio", shortLabel: "M", icon: Frame },
  { value: "large", label: "Grande", shortLabel: "G", icon: Maximize },
];

const VIEW_ICON_BG: Record<AgendaView, string> = {
  day: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
  week: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
  month: "bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400",
};

const VIEW_ACCENT: Record<AgendaView, string> = {
  day: "border-blue-400 bg-blue-50 dark:bg-blue-950/30",
  week: "border-violet-400 bg-violet-50 dark:bg-violet-950/30",
  month: "border-teal-400 bg-teal-50 dark:bg-teal-950/30",
};

const VIEW_BADGE: Record<AgendaView, string> = {
  day: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  week: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  month: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ViewAppearancePanel({ view, label, icon: Icon }: ViewAppearancePanelProps) {
  const {
    appearance,
    hasOverrideForView,
    setHeightScale,
    setFontScale,
    setOpacity,
    setCardSize,
    applyToAllViews,
    resetView,
  } = useAgendaAppearancePersistence(view);

  const [appliedAll, setAppliedAll] = useState(false);

  const handleApplyToAll = () => {
    applyToAllViews({
      cardSize: appearance.cardSize,
      heightScale: appearance.heightScale,
      fontScale: appearance.fontScale,
      opacity: appearance.opacity,
    });
    setAppliedAll(true);
    setTimeout(() => setAppliedAll(false), 2000);
  };

  const overrideAction = hasOverrideForView ? (
    <Badge className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", VIEW_BADGE[view])}>
      Personalizado
    </Badge>
  ) : null;

  return (
    <SettingsSectionCard
      icon={<Icon className="h-4 w-4" />}
      iconBg={VIEW_ICON_BG[view]}
      title={label}
      description={`Aparência da visualização ${label.toLowerCase()}`}
      action={overrideAction}
      variant={hasOverrideForView ? "highlight" : "default"}
    >
      <div className="space-y-5">
        {/* Card Size Selector */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tamanho dos cards
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {CARD_SIZE_OPTIONS.map(({ value, label: sizeLabel, shortLabel, icon: SizeIcon }) => {
              const isSelected = appearance.cardSize === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCardSize(value)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-150",
                    "hover:shadow-sm hover:-translate-y-0.5",
                    isSelected
                      ? cn("border-2", VIEW_ACCENT[view])
                      : "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
                      isSelected ? VIEW_ICON_BG[view] : "bg-muted text-muted-foreground",
                    )}
                  >
                    <SizeIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-medium leading-none">{shortLabel}</span>
                  <span className="text-[9px] text-muted-foreground leading-none hidden sm:block">
                    {sizeLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          {/* Height Scale */}
          <SliderControl
            label="Altura dos slots"
            icon={<Clock className="w-3.5 h-3.5" />}
            value={appearance.heightScale}
            min={0}
            max={10}
            step={1}
            displayValue={`${Math.round(24 * (0.5 + (appearance.heightScale / 10) * 1.5))}px`}
            minLabel="Compacto"
            maxLabel="Espaçoso"
            onValueChange={setHeightScale}
          />

          {/* Font Scale */}
          <SliderControl
            label="Tamanho da fonte"
            icon={<Type className="w-3.5 h-3.5" />}
            value={appearance.fontScale}
            min={0}
            max={10}
            step={1}
            displayValue={`${Math.round(80 + (appearance.fontScale / 10) * 70)}%`}
            minLabel="Pequeno"
            maxLabel="Grande"
            onValueChange={setFontScale}
          />

          {/* Opacity */}
          <SliderControl
            label="Transparência"
            icon={<Layers className="w-3.5 h-3.5" />}
            value={appearance.opacity}
            min={0}
            max={100}
            step={5}
            displayValue={`${appearance.opacity}%`}
            minLabel="Transparente"
            maxLabel="Sólido"
            onValueChange={setOpacity}
          />
        </div>

        {/* Live Preview */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pré-visualização
          </Label>
          <LiveViewPreview appearance={appearance} view={view} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            onClick={handleApplyToAll}
            className="flex-1 gap-1.5 rounded-xl text-xs"
          >
            {appliedAll ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Aplicado!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Aplicar a todas as views
              </>
            )}
          </Button>

          {hasOverrideForView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetView}
              className="gap-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar padrão
            </Button>
          )}
        </div>
      </div>
    </SettingsSectionCard>
  );
}

// ─── SliderControl ─────────────────────────────────────────────────────────────

interface SliderControlProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  minLabel: string;
  maxLabel: string;
  onValueChange: (value: number) => void;
}

function SliderControl({
  label,
  icon,
  value,
  min,
  max,
  step,
  displayValue,
  minLabel,
  maxLabel,
  onValueChange,
}: SliderControlProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-muted text-muted-foreground">
            {icon}
          </div>
          <Label className="text-xs font-medium">{label}</Label>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-muted border border-border/60">
          <span className="text-[10px] font-mono font-bold text-muted-foreground">
            {displayValue}
          </span>
        </div>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
        className="cursor-pointer"
      />
      <div className="flex justify-between px-0.5">
        <span className="text-[10px] text-muted-foreground">{minLabel}</span>
        <span className="text-[10px] text-muted-foreground">{maxLabel}</span>
      </div>
    </div>
  );
}
