import { useState } from "react";
import { SlidersHorizontal, RotateCcw, Globe, Check, Calendar, Layout, Maximize2, Minimize2, Palette, Settings2, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/schedule/settings/shared/SectionCard";
import { cn } from "@/lib/utils";
import { useAgendaAppearancePersistence } from "@/hooks/useAgendaAppearancePersistence";
import { useRegisterTabHandle } from "../useRegisterTabHandle";
import type { TabComponentProps } from "../types";
import type { AgendaView } from "@/types/agenda";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CardSize = "extra_small" | "small" | "medium" | "large";

const DENSITY_OPTIONS: Array<{ value: CardSize; label: string; description: string; icon: React.ElementType }> = [
  { value: "extra_small", label: "Mínimo", description: "Máx. densidade", icon: Minimize2 },
  { value: "small", label: "Compacto", description: "Visão focada", icon: MonitorSmartphone },
  { value: "medium", label: "Balanceado", description: "Recomendado", icon: Layout },
  { value: "large", label: "Espaçoso", description: "Mais respiro", icon: Maximize2 },
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
    hint: "Padrão recomendado",
    patch: { cardSize: "medium", heightScale: 5, fontScale: 5, paddingScale: 5 },
  },
  {
    key: "apresentacao",
    label: "Apresentação",
    hint: "Foco e tela grande",
    patch: { cardSize: "large", heightScale: 9, fontScale: 9, paddingScale: 8 },
  },
];

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

const VIEW_CONFIG: Array<{ view: AgendaView; label: string }> = [
  { view: "week", label: "Semana" },
  { view: "day", label: "Dia" },
  { view: "month", label: "Mês" },
];

function proportionalCardSize(scale: number): CardSize {
  if (scale <= 2) return "extra_small";
  if (scale <= 4) return "small";
  if (scale <= 7) return "medium";
  return "large";
}

function SimpleFieldRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/20">
      <div>
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function ViewControls({
  view,
  onDensity,
  onHeightScale,
  onFontScale,
  onPaddingScale,
  onOpacity,
  onTheme,
  onBorderRadius,
  onBorderStyle,
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
  const cardSize = (appearance.cardSize ?? "medium") as CardSize;
  const heightScale = appearance.heightScale ?? 5;
  const fontScale = appearance.fontScale ?? 5;
  const paddingScale = appearance.paddingScale ?? 5;
  const opacity = appearance.opacity ?? 100;
  const colorTheme = appearance.colorTheme ?? "status";
  const borderRadius = appearance.borderRadius ?? "lg";
  const borderStyle = appearance.borderStyle ?? "left";

  return (
    <div className="space-y-6">
      {/* Header com status de override */}
      <div className="flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Configurações para visão: <span className="font-bold capitalize">{view === 'week' ? 'Semana' : view === 'day' ? 'Dia' : 'Mês'}</span>
            </p>
            {hasOverrideForView ? (
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                Esta visão possui ajustes personalizados independentes.
              </p>
            ) : (
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                Herdando configurações globais.
              </p>
            )}
          </div>
        </div>
        {hasOverrideForView && (
          <Button variant="ghost" size="sm" onClick={onResetView} className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Restaurar Herança
          </Button>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Estrutura e Densidade</CardTitle>
          </div>
          <CardDescription>Defina o tamanho e espaçamento dos cards de agendamento</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Ponto de Partida</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DENSITY_OPTIONS.map((opt) => {
                const active = cardSize === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onDensity(opt.value)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all",
                      active
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400",
                    )}
                  >
                    <Icon className={cn("h-5 w-5 mb-2", active ? "text-primary" : "text-muted-foreground")} />
                    <p className="text-sm font-semibold leading-tight">{opt.label}</p>
                    <p className="text-[10px] mt-1 opacity-80">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="pt-2">
            <SimpleFieldRow
              label="Altura dos cards"
              description="Ajuste a altura que o card ocupa na grade"
              control={
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-6 text-right">{heightScale}</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={heightScale}
                    onChange={(e) => onHeightScale(Number(e.target.value))}
                    className="w-32 accent-primary"
                    aria-label="Altura dos cards"
                  />
                </div>
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Estilo Visual</CardTitle>
          </div>
          <CardDescription>Ajustes finos de tipografia, bordas e cores</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-3">
            <SimpleFieldRow
              label="Tamanho da Fonte"
              control={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 text-right">{fontScale}</span>
                  <input type="range" min={1} max={10} value={fontScale} onChange={(e) => onFontScale(Number(e.target.value))} className="w-24 accent-primary" />
                </div>
              }
            />
            <SimpleFieldRow
              label="Espaçamento Interno"
              control={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 text-right">{paddingScale}</span>
                  <input type="range" min={1} max={10} value={paddingScale} onChange={(e) => onPaddingScale(Number(e.target.value))} className="w-24 accent-primary" />
                </div>
              }
            />
            <SimpleFieldRow
              label="Opacidade"
              control={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 text-right">{opacity}%</span>
                  <input type="range" min={20} max={100} step={10} value={opacity} onChange={(e) => onOpacity(Number(e.target.value))} className="w-24 accent-primary" />
                </div>
              }
            />
          </div>
          <div className="space-y-3">
            <SimpleFieldRow
              label="Tema de Cores"
              control={
                <select value={colorTheme} onChange={(e) => onTheme(e.target.value)} className="w-32 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="status">Padrão (Forte)</option>
                  <option value="pastel">Pastel (Suave)</option>
                  <option value="vibrant">Vibrante</option>
                  <option value="monochrome">Monocromático</option>
                </select>
              }
            />
            <SimpleFieldRow
              label="Estilo da Borda"
              control={
                <select value={borderStyle} onChange={(e) => onBorderStyle(e.target.value)} className="w-32 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="left">Esquerda</option>
                  <option value="full">Completo</option>
                  <option value="none">Nenhuma</option>
                </select>
              }
            />
            <SimpleFieldRow
              label="Arredondamento"
              control={
                <select value={borderRadius} onChange={(e) => onBorderRadius(e.target.value)} className="w-32 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="none">0px (Quadrado)</option>
                  <option value="sm">2px (Suave)</option>
                  <option value="md">4px (Médio)</option>
                  <option value="lg">8px (Padrão)</option>
                  <option value="full">Total (Pílula)</option>
                </select>
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-5">
        <div>
          <p className="text-sm font-semibold">Aplicar este visual a todas as visões?</p>
          <p className="text-xs text-muted-foreground">Copiará as configurações acima para Dia, Semana e Mês.</p>
        </div>
        <Button onClick={onApplyToAll} size="sm" className="gap-2">
          <Globe className="h-3.5 w-3.5" />
          Copiar para todas
        </Button>
      </div>
    </div>
  );
}

function SaveIndicator({ isSaving, lastSavedAt }: { isSaving: boolean; lastSavedAt: Date | null }) {
  if (isSaving) return <span className="flex items-center gap-1.5 text-xs text-blue-500 font-medium"><span className="h-2 w-2 animate-ping rounded-full bg-blue-500"></span> Salvando...</span>;
  if (lastSavedAt) return <span className="flex items-center gap-1 text-xs text-slate-500 font-medium"><Check className="h-3.5 w-3.5 text-green-500" /> Salvo</span>;
  return null;
}

export function AparenciaTab({ registerHandle }: TabComponentProps) {
  const [activeView, setActiveView] = useState<AgendaView>("week");
  const [autoAdjust, setAutoAdjust] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(AUTO_ADJUST_KEY) !== "false";
  });

  const {
    appearance: weekAppearance,
    applyToAllViews,
    resetAll,
    isSyncing,
    lastSyncedAt,
    display,
    setDisplay,
  } = useAgendaAppearancePersistence("week");

  const activeHook = useAgendaAppearancePersistence(activeView);

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

  const preview = PREVIEW_BY_SIZE[(activeHook.appearance.cardSize ?? "medium") as CardSize];
  const activeFontScale = activeHook.appearance.fontScale ?? 5;
  const activePaddingScale = activeHook.appearance.paddingScale ?? 5;
  const activeOpacity = activeHook.appearance.opacity ?? 100;
  const activeBorderStyle = activeHook.appearance.borderStyle ?? "left";
  const activeBorderRadius = activeHook.appearance.borderRadius ?? "lg";

  return (
    <SectionCard
      icon={<SlidersHorizontal className="h-5 w-5 text-primary" />}
      title="Aparência da Agenda"
      description="Personalize o visual, a densidade e o comportamento dos cards na sua agenda."
      action={
        <div className="flex items-center gap-4">
          <SaveIndicator isSaving={isSyncing} lastSavedAt={lastSyncedAt} />
          <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Restaurar Padrões
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        
        {/* Main Settings Area (Left Column) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Temas Rápidos
              </p>
              <div className="flex items-center gap-2">
                <Switch id="auto-adjust" checked={autoAdjust} onCheckedChange={handleAutoAdjust} />
                <label htmlFor="auto-adjust" className="text-xs text-muted-foreground cursor-pointer">
                  Ajuste automático
                </label>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-3">
              {APPEARANCE_PRESETS.map((p) => {
                const isActive =
                  activeHook.appearance.cardSize === p.patch.cardSize &&
                  (activeHook.appearance.heightScale ?? 5) === p.patch.heightScale;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setAutoAdjust(false);
                      if (typeof window !== "undefined") localStorage.setItem(AUTO_ADJUST_KEY, "false");
                      activeHook.setAll(p.patch);
                    }}
                    className={cn(
                      "flex flex-col items-start p-3.5 rounded-xl border transition-all duration-200 text-left",
                      isActive
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900",
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <p className={cn("text-sm font-bold", isActive ? "text-primary" : "text-foreground")}>{p.label}</p>
                      {isActive && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* View Specific Configurations */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3">
              Personalização por Visão
            </p>
            
            <div className="flex p-1 bg-slate-100/80 dark:bg-slate-900/80 rounded-xl mb-4 w-full sm:w-fit border border-slate-200/50 dark:border-slate-800/50">
              {VIEW_CONFIG.map(({ view, label }) => {
                const isActive = activeView === view;
                return (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={cn(
                      "flex items-center gap-1.5 px-6 py-2 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-none justify-center",
                      isActive
                        ? "bg-white text-primary shadow-sm dark:bg-slate-800 dark:text-blue-400"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-950 p-1">
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
                onResetView={() => activeHook.resetView()}
              />
            </div>
          </div>

          {/* Global Settings */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3">
              Comportamentos Globais
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="shadow-none bg-slate-50/50 dark:bg-slate-900/30">
                <CardHeader className="pb-3 px-4 pt-4">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-bold">Conteúdo do Card</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <SimpleFieldRow
                    label="Duração"
                    control={<Switch checked={display.showDuration} onCheckedChange={(v) => setDisplay({ showDuration: v })} />}
                  />
                  <SimpleFieldRow
                    label="Tipo"
                    control={<Switch checked={display.showType} onCheckedChange={(v) => setDisplay({ showType: v })} />}
                  />
                  <SimpleFieldRow
                    label="Telefone"
                    control={<Switch checked={display.showPhone} onCheckedChange={(v) => setDisplay({ showPhone: v })} />}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-none bg-slate-50/50 dark:bg-slate-900/30">
                <CardHeader className="pb-3 px-4 pt-4">
                  <div className="flex items-center gap-2">
                    <Layout className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-bold">Grade da Agenda</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <SimpleFieldRow
                    label="Marcador Hora Atual"
                    control={<Switch checked={display.nowIndicator} onCheckedChange={(v) => setDisplay({ nowIndicator: v })} />}
                  />
                  <SimpleFieldRow
                    label="Sombrear Horário Off"
                    control={<Switch checked={display.businessHours} onCheckedChange={(v) => setDisplay({ businessHours: v })} />}
                  />
                  <SimpleFieldRow
                    label="Ocultar Domingo"
                    control={<Switch checked={display.hideSunday} onCheckedChange={(v) => setDisplay({ hideSunday: v })} />}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

        </div>

        {/* Sticky Preview Sidebar (Right Column) */}
        <div className="lg:col-span-4 relative">
          <div className="sticky top-24 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800/80 dark:bg-slate-900/30 flex flex-col min-h-[400px]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <MonitorSmartphone className="h-3.5 w-3.5" />
                Preview em Tempo Real
              </p>
              <Badge variant="outline" className="bg-white dark:bg-slate-950 font-medium text-[10px]">
                Visão {VIEW_CONFIG.find(v => v.view === activeView)?.label}
              </Badge>
            </div>
            
            {/* The mock agenda grid */}
            <div className="flex-1 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner flex flex-col relative"
                 style={{ opacity: activeOpacity / 100 }}>
              
              {/* Fake Time Axis and Grid lines */}
              <div className="absolute inset-0 flex flex-col pointer-events-none opacity-20 dark:opacity-10">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex-1 border-b border-slate-300 dark:border-slate-700 w-full" />
                ))}
              </div>

              {/* The cards */}
              <div className="p-4 space-y-3 relative z-10 h-full overflow-y-auto custom-scrollbar">
                {PREVIEW_CARDS.map((c) => (
                  <div
                    key={c.name}
                    className="flex flex-col justify-center border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100 shadow-sm transition-all duration-300 relative overflow-hidden"
                    style={{
                      minHeight: preview.minHeight,
                      fontSize: preview.fontSize * (activeFontScale / 5),
                      padding: `${2 * (activePaddingScale / 5)}px 8px`,
                      borderWidth: activeBorderStyle === "full" ? "1px" : "0",
                      borderLeftWidth: activeBorderStyle === "left" || activeBorderStyle === "full" ? "4px" : "0",
                      borderLeftColor: activeBorderStyle === "left" ? "rgb(59 130 246)" : undefined,
                      borderRadius: activeBorderRadius === "none" ? "0" : activeBorderRadius === "sm" ? "2px" : activeBorderRadius === "lg" ? "8px" : activeBorderRadius === "full" ? "9999px" : "4px",
                    }}
                  >
                    <span className="truncate font-bold tracking-tight z-10">{c.name}</span>
                    <div className="flex items-center gap-1.5 opacity-80 z-10 mt-0.5" style={{ fontSize: preview.fontSize - 1 }}>
                      <span className="font-medium">{c.time}</span>
                      {display.showType && <span className="opacity-70 truncate">• Retorno</span>}
                      {display.showDuration && <span className="opacity-70 truncate">• 1h</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-4">
              Os ajustes refletem instantaneamente nos seus agendamentos.
            </p>
          </div>
        </div>

      </div>
    </SectionCard>
  );
}
