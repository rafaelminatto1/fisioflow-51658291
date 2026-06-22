import { useState } from "react";
import { SlidersHorizontal, RotateCcw, Globe, Check, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/schedule/settings/shared/SectionCard";
import { FieldRow } from "@/components/schedule/settings/shared/FieldRow";
import { cn } from "@/lib/utils";
import { useAgendaAppearancePersistence } from "@/hooks/useAgendaAppearancePersistence";
import { useRegisterTabHandle } from "../useRegisterTabHandle";
import type { TabComponentProps } from "../types";
import type { AgendaView } from "@/types/agenda";

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

const VIEW_CONFIG: Array<{ view: AgendaView; label: string; shortLabel: string; icon: string }> = [
  { view: "week", label: "Semana", shortLabel: "Sem", icon: "📅" },
  { view: "day", label: "Dia", shortLabel: "Dia", icon: "🗓️" },
  { view: "month", label: "Mês", shortLabel: "Mês", icon: "📆" },
];

function proportionalCardSize(scale: number): CardSize {
  if (scale <= 2) return "extra_small";
  if (scale <= 4) return "small";
  if (scale <= 7) return "medium";
  return "large";
}

// Sub-componente para cada visão — garante que o hook sempre recebe a mesma view
function ViewControls({
  view,
  onDensity,
  onHeightScale,
  onApplyToAll,
  onResetView,
}: {
  view: AgendaView;
  onDensity: (size: CardSize) => void;
  onHeightScale: (val: number) => void;
  onApplyToAll: () => void;
  onResetView: () => void;
}) {
  const { appearance, hasOverrideForView } = useAgendaAppearancePersistence(view);
  const cardSize = (appearance.cardSize ?? "medium") as CardSize;
  const heightScale = appearance.heightScale ?? 5;
  const preview = PREVIEW_BY_SIZE[cardSize];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-5">
        {/* Density selector */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Densidade dos cards
            </p>
            <div className="flex items-center gap-2">
              {hasOverrideForView && (
                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
                  <Check className="h-2.5 w-2.5" />
                  Personalizado
                </Badge>
              )}
              {hasOverrideForView && (
                <button
                  type="button"
                  onClick={onResetView}
                  className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Herdar global
                </button>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {DENSITY_OPTIONS.map((opt) => {
              const active = cardSize === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onDensity(opt.value)}
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

        {/* Height scale slider */}
        <FieldRow
          label="Altura dos cards"
          description="Controle fino da altura das linhas de horário"
          control={
            <input
              type="range"
              min={1}
              max={10}
              value={heightScale}
              onChange={(e) => onHeightScale(Number(e.target.value))}
              className="w-48 accent-blue-600"
              aria-label="Altura dos cards"
            />
          }
        />

        {/* Apply to all views */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
          <div>
            <p className="text-sm font-medium">Aplicar a todas as visões</p>
            <p className="text-[11px] text-muted-foreground">
              Copia estas configurações para Dia, Semana e Mês
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onApplyToAll} className="shrink-0">
            <Globe className="mr-1.5 h-3.5 w-3.5" />
            Aplicar a todas
          </Button>
        </div>
      </div>

      {/* Preview */}
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
  );
}

export function AparenciaTab({ registerHandle }: TabComponentProps) {
  const [activeView, setActiveView] = useState<AgendaView>("week");
  const [autoAdjust, setAutoAdjust] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(AUTO_ADJUST_KEY) !== "false";
  });

  // Para operações globais (auto-adjust, reset all) usamos "week" como visão canônica
  const {
    appearance: weekAppearance,
    applyToAllViews,
    resetAll,
    isSyncing,
    lastSyncedAt,
  } = useAgendaAppearancePersistence("week");

  // Hook da visão ativa — usado pelos handlers específicos
  const activeHook = useAgendaAppearancePersistence(activeView);

  // Aparência salva automaticamente (debounced); o contrato de save fica inerte.
  useRegisterTabHandle(registerHandle, {
    isDirty: false,
    isSaving: isSyncing,
    lastSavedAt: lastSyncedAt,
    save: () => {},
    discard: () => {},
  });

  const heightScale = weekAppearance.heightScale ?? 5;

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

  // Handlers para a visão ativa
  const handleDensity = (size: CardSize) => {
    setAutoAdjust(false);
    if (typeof window !== "undefined") localStorage.setItem(AUTO_ADJUST_KEY, "false");
    activeHook.setCardSize(size);
  };

  const handleHeightScale = (val: number) => {
    if (autoAdjust) {
      activeHook.setAll({ heightScale: val, cardSize: proportionalCardSize(val) });
    } else {
      activeHook.setHeightScale(val);
    }
  };

  const handleApplyToAll = () => {
    const curr = activeHook.appearance;
    applyToAllViews({
      cardSize: curr.cardSize,
      heightScale: curr.heightScale,
    });
  };

  const handleResetView = () => {
    activeHook.resetView();
  };

  return (
    <SectionCard
      icon={<SlidersHorizontal className="h-4 w-4" />}
      title="Aparência da Agenda"
      description="Configure a densidade e altura dos cards. Cada visão pode ter configuração independente."
      action={
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Restaurar padrões
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Auto adjust toggle */}
        <FieldRow
          label="Ajuste automático de densidade"
          description="A densidade dos cards acompanha a altura escolhida"
          control={<Switch checked={autoAdjust} onCheckedChange={handleAutoAdjust} />}
        />

        {/* View selector tabs */}
        <div>
          <div className="mb-3 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Configurar visão
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/40">
            {VIEW_CONFIG.map(({ view, label }) => {
              // Check override for each view tab
              const isActive = activeView === view;
              return (
                <ViewTabButton
                  key={view}
                  view={view}
                  label={label}
                  isActive={isActive}
                  onClick={() => setActiveView(view)}
                />
              );
            })}
          </div>
        </div>

        {/* Controls for the active view */}
        <ViewControls
          key={activeView}
          view={activeView}
          onDensity={handleDensity}
          onHeightScale={handleHeightScale}
          onApplyToAll={handleApplyToAll}
          onResetView={handleResetView}
        />
      </div>
    </SectionCard>
  );
}

// Tab button that reads hasOverrideForView for the badge
function ViewTabButton({
  view,
  label,
  isActive,
  onClick,
}: {
  view: AgendaView;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const { hasOverrideForView } = useAgendaAppearancePersistence(view);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
        isActive
          ? "bg-white text-foreground shadow-sm dark:bg-slate-800"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {hasOverrideForView && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isActive ? "bg-blue-500" : "bg-slate-400",
          )}
          aria-label="Configuração personalizada"
        />
      )}
    </button>
  );
}
