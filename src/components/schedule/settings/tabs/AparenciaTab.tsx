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

const APPEARANCE_PRESETS: Array<{
  key: string;
  label: string;
  hint: string;
  patch: { cardSize: CardSize; heightScale: number; fontScale: number; paddingScale: number };
}> = [
  {
    key: "denso",
    label: "Denso",
    hint: "Muitos pacientes/dia",
    patch: { cardSize: "small", heightScale: 2, fontScale: 4, paddingScale: 2 },
  },
  {
    key: "confortavel",
    label: "Confortável",
    hint: "Padrão",
    patch: { cardSize: "medium", heightScale: 5, fontScale: 5, paddingScale: 5 },
  },
  {
    key: "apresentacao",
    label: "Apresentação",
    hint: "Tela grande",
    patch: { cardSize: "large", heightScale: 9, fontScale: 9, paddingScale: 8 },
  },
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
  onFontScale,
  onPaddingScale,
  onOpacity,
  onApplyToAll,
  onResetView,
}: {
  view: AgendaView;
  onDensity: (size: CardSize) => void;
  onHeightScale: (val: number) => void;
  onFontScale: (val: number) => void;
  onPaddingScale: (val: number) => void;
  onOpacity: (val: number) => void;
  onTheme: (val: string) => void;
  onBorderRadius: (val: string) => void;
  onBorderStyle: (val: string) => void;
  onApplyToAll: () => void;
  onResetView: () => void;
}) {
  const { appearance, hasOverrideForView } = useAgendaAppearancePersistence(view);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const cardSize = (appearance.cardSize ?? "medium") as CardSize;
  const heightScale = appearance.heightScale ?? 5;
  const fontScale = appearance.fontScale ?? 5;
  const paddingScale = appearance.paddingScale ?? 5;
  const opacity = appearance.opacity ?? 100;
  const colorTheme = appearance.colorTheme ?? "status";
  const borderRadius = appearance.borderRadius ?? "lg";
  const borderStyle = appearance.borderStyle ?? "left";
  const preview = PREVIEW_BY_SIZE[cardSize];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 lg:gap-12">
      <div className="space-y-5 lg:col-span-3">
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
                    "border-l-4 p-3 text-left transition-all",
                    active
                      ? "border-slate-900 bg-slate-50 dark:border-slate-50 dark:bg-slate-900/50"
                      : "border-transparent bg-white hover:bg-slate-50 dark:bg-transparent dark:hover:bg-slate-900",
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

        {/* Ajustes finos (recolhível) */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            {showAdvanced ? "▾" : "▸"} Ajustes finos
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-3">
              <FieldRow
                label="Fonte"
                description="Tamanho do texto dos cards"
                control={
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={fontScale}
                    onChange={(e) => onFontScale(Number(e.target.value))}
                    className="w-48 accent-blue-600"
                    aria-label="Fonte"
                  />
                }
              />
              <FieldRow
                label="Espaçamento"
                description="Respiro interno dos cards"
                control={
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={paddingScale}
                    onChange={(e) => onPaddingScale(Number(e.target.value))}
                    className="w-48 accent-blue-600"
                    aria-label="Espaçamento"
                  />
                }
              />
              <FieldRow
                label="Opacidade"
                description="Transparência dos cards"
                control={
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={opacity}
                    onChange={(e) => onOpacity(Number(e.target.value))}
                    className="w-48 accent-blue-600"
                    aria-label="Opacidade"
                  />
                }
              />
              <FieldRow
                label="Tema de Cores"
                description="Como as cores dos status são aplicadas"
                control={
                  <select
                    value={colorTheme}
                    onChange={(e) => onTheme(e.target.value)}
                    className="w-48 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="status">Padrão (Forte)</option>
                    <option value="pastel">Pastel (Suave)</option>
                    <option value="vibrant">Vibrante</option>
                    <option value="monochrome">Monocromático</option>
                  </select>
                }
              />
              <FieldRow
                label="Estilo da Borda"
                description="Borda de destaque do card"
                control={
                  <select
                    value={borderStyle}
                    onChange={(e) => onBorderStyle(e.target.value)}
                    className="w-48 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="left">Apenas Esquerda</option>
                    <option value="full">Contorno Completo</option>
                    <option value="none">Sem Borda</option>
                  </select>
                }
              />
              <FieldRow
                label="Arredondamento"
                description="Formato dos cantos dos cards"
                control={
                  <select
                    value={borderRadius}
                    onChange={(e) => onBorderRadius(e.target.value)}
                    className="w-48 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="none">Quadrado (0px)</option>
                    <option value="sm">Suave (2px)</option>
                    <option value="md">Médio (4px)</option>
                    <option value="lg">Arredondado (8px)</option>
                    <option value="full">Pílula (Total)</option>
                  </select>
                }
              />
            </div>
          )}
        </div>

        {/* Apply to all views */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-8 dark:border-slate-800">
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
      <div
        data-testid="aparencia-preview"
        className="border-t border-slate-200 pt-8 dark:border-slate-800 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
        style={{ opacity: opacity / 100 }}
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pré-visualização
        </p>
        <div className="space-y-1.5">
          {PREVIEW_CARDS.map((c) => (
            <div
              key={c.name}
              className="flex flex-col justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
              style={{
                minHeight: preview.minHeight,
                fontSize: preview.fontSize * (fontScale / 5),
                padding: `${2 * (paddingScale / 5)}px 8px`,
                borderWidth: borderStyle === "full" ? "1px" : "0",
                borderLeftWidth: borderStyle === "left" || borderStyle === "full" ? "4px" : "0",
                borderRadius: borderRadius === "none" ? "0" : borderRadius === "sm" ? "2px" : borderRadius === "lg" ? "8px" : borderRadius === "full" ? "9999px" : "4px",
              }}
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

function SaveIndicator({ isSaving, lastSavedAt }: { isSaving: boolean; lastSavedAt: Date | null }) {
  if (isSaving) return <span className="flex items-center gap-1.5 text-xs text-blue-500"><span className="h-2 w-2 animate-ping rounded-full bg-blue-500"></span> Salvando...</span>;
  if (lastSavedAt) return <span className="flex items-center gap-1 text-xs text-slate-500"><Check className="h-3.5 w-3.5 text-green-500" /> Salvo</span>;
  return null;
}

export function AparenciaTab({ registerHandle }: TabComponentProps) {
  const [activeView, setActiveView] = useState<AgendaView>("week");
  const [autoAdjust, setAutoAdjust] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(AUTO_ADJUST_KEY) !== "false";
  });

  // Para operações globais (auto-adjust, reset all) usamos "week" como visão canônica.
  // display é global (não por-visão) — qualquer hook serve como fonte.
  const {
    appearance: weekAppearance,
    applyToAllViews,
    resetAll,
    isSyncing,
    lastSyncedAt,
    display,
    setDisplay,
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
      fontScale: curr.fontScale,
      paddingScale: curr.paddingScale,
      opacity: curr.opacity,
      timeFontScale: curr.timeFontScale,
      typeFontScale: curr.typeFontScale,
      colorTheme: curr.colorTheme,
      borderRadius: curr.borderRadius,
      borderStyle: curr.borderStyle,
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
        <div className="flex items-center gap-4">
          <SaveIndicator isSaving={isSyncing} lastSavedAt={lastSyncedAt} />
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Restaurar padrões
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Presets de 1 clique */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Presets
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {APPEARANCE_PRESETS.map((p) => {
              const active =
                activeHook.appearance.cardSize === p.patch.cardSize &&
                (activeHook.appearance.heightScale ?? 5) === p.patch.heightScale;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setAutoAdjust(false);
                    if (typeof window !== "undefined")
                      localStorage.setItem(AUTO_ADJUST_KEY, "false");
                    activeHook.setAll(p.patch);
                  }}
                  className={cn(
                    "border-l-4 p-3 text-left transition-all",
                    active
                      ? "border-slate-900 bg-slate-50 dark:border-slate-50 dark:bg-slate-900/50"
                      : "border-transparent bg-white hover:bg-slate-50 dark:bg-transparent dark:hover:bg-slate-900",
                  )}
                >
                  <p className="text-sm font-semibold">{p.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{p.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

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
          <div className="flex gap-4 border-b border-slate-200 pb-2 dark:border-slate-800">
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
          onFontScale={(v) => activeHook.setFontScale(v)}
          onPaddingScale={(v) => activeHook.setPaddingScale(v)}
          onOpacity={(v) => activeHook.setOpacity(v)}
          onTheme={(v) => activeHook.setColorTheme(v)}
          onBorderRadius={(v) => activeHook.setBorderRadius(v)}
          onBorderStyle={(v) => activeHook.setBorderStyle(v)}
          onApplyToAll={handleApplyToAll}
          onResetView={handleResetView}
        />

        {/* Seção global — conteúdo do card + comportamento da grade */}
        <div className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conteúdo do card · agenda toda
            </p>
            <div className="space-y-2">
              <FieldRow
                label="Mostrar duração"
                description="Tempo de cada atendimento no card"
                control={
                  <Switch
                    checked={display.showDuration}
                    onCheckedChange={(v) => setDisplay({ showDuration: v })}
                    aria-label="Mostrar duração"
                  />
                }
              />
              <FieldRow
                label="Mostrar tipo"
                description="Tipo de atendimento no card"
                control={
                  <Switch
                    checked={display.showType}
                    onCheckedChange={(v) => setDisplay({ showType: v })}
                    aria-label="Mostrar tipo"
                  />
                }
              />
              <FieldRow
                label="Mostrar telefone"
                description="Telefone do paciente no card"
                control={
                  <Switch
                    checked={display.showPhone}
                    onCheckedChange={(v) => setDisplay({ showPhone: v })}
                    aria-label="Mostrar telefone"
                  />
                }
              />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Comportamento da grade · agenda toda
            </p>
            <div className="space-y-2">
              <FieldRow
                label="Destacar hora atual"
                description="Linha do horário atual"
                control={
                  <Switch
                    checked={display.nowIndicator}
                    onCheckedChange={(v) => setDisplay({ nowIndicator: v })}
                    aria-label="Destacar hora atual"
                  />
                }
              />
              <FieldRow
                label="Sombrear fora do expediente"
                description="Realça horários de funcionamento"
                control={
                  <Switch
                    checked={display.businessHours}
                    onCheckedChange={(v) => setDisplay({ businessHours: v })}
                    aria-label="Sombrear fora do expediente"
                  />
                }
              />
              <FieldRow
                label="Ocultar domingo"
                description="Esconde a coluna de domingo"
                control={
                  <Switch
                    checked={display.hideSunday}
                    onCheckedChange={(v) => setDisplay({ hideSunday: v })}
                    aria-label="Ocultar domingo"
                  />
                }
              />
            </div>
          </div>
        </div>
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
        "relative flex items-center justify-center gap-1.5 pb-2 text-sm font-bold uppercase tracking-widest transition-all",
        isActive
          ? "border-b-2 border-slate-900 text-slate-900 dark:border-slate-50 dark:text-slate-50"
          : "border-b-2 border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
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
