import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { SectionCard } from "../shared/SectionCard";
import { FieldRow } from "../shared/FieldRow";
import { cn } from "@/lib/utils";
import { useAgendaAppearancePersistence } from "@/hooks/useAgendaAppearancePersistence";
import { Switch } from "@/components/ui/switch";
import { LiveViewPreview } from "@/components/schedule/settings/LiveViewPreview";

type CardSize = "extra_small" | "small" | "medium" | "large";
type AgendaView = "day" | "week" | "month";

const DENSITY_OPTIONS: Array<{ value: CardSize; label: string; description: string }> = [
  { value: "extra_small", label: "Mínimo", description: "Máxima densidade" },
  { value: "small", label: "Compacto", description: "Vê mais sem rolar" },
  { value: "medium", label: "Balanceado", description: "Padrão recomendado" },
  { value: "large", label: "Espaçoso", description: "Mais respiro visual" },
];

export function AparenciaTab() {
  const [activeView, setActiveView] = useState<AgendaView>("week");
  const [autoAdjust, setAutoAdjust] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("agenda_appearance_auto_adjust") !== "false";
  });

  const {
    appearance,
    setCardSize,
    setHeightScale,
    setFontScale,
    setOpacity,
    applyToAllViews,
    resetView,
    resetAll,
    slotHeightPx,
    fontPercentage,
  } = useAgendaAppearancePersistence(activeView);

  // Proportional cardSize mapping based on heightScale
  const getProportionalCardSize = (scale: number): CardSize => {
    if (scale <= 2) return "extra_small";
    if (scale <= 4) return "small";
    if (scale <= 7) return "medium";
    return "large";
  };

  const handleHeightScaleChange = (val: number) => {
    setHeightScale(val);
    if (autoAdjust) {
      const proportionalSize = getProportionalCardSize(val);
      if (appearance.cardSize !== proportionalSize) {
        setCardSize(proportionalSize);
      }
    }
  };

  const handleManualCardSizeChange = (size: CardSize) => {
    setCardSize(size);
    // Disable autoAdjust to let user's manual selection win
    setAutoAdjust(false);
    localStorage.setItem("agenda_appearance_auto_adjust", "false");
  };

  const handleAutoAdjustChange = (checked: boolean) => {
    setAutoAdjust(checked);
    localStorage.setItem("agenda_appearance_auto_adjust", String(checked));
    if (checked) {
      const proportionalSize = getProportionalCardSize(appearance.heightScale);
      if (appearance.cardSize !== proportionalSize) {
        setCardSize(proportionalSize);
      }
    }
  };

  return (
    <SectionCard
      icon={<SlidersHorizontal className="h-4 w-4" />}
      title="Aparência da Agenda"
      description="Personalize a densidade, altura dos slots, escala de fonte e opacidade da sua agenda"
    >
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Coluna da Esquerda: Controles */}
        <div className="lg:col-span-7 space-y-6">
          {/* Seletor de Visualização */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Visualização para Configurar
            </label>
            <div className="flex gap-1.5">
              {(["day", "week", "month"] as AgendaView[]).map((v) => {
                const label = v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês";
                const active = activeView === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setActiveView(v)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg border transition",
                      active
                        ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Densidade */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Densidade dos Cards</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Ajustar automaticamente com a altura</span>
                <Switch
                  checked={autoAdjust}
                  onCheckedChange={handleAutoAdjustChange}
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {DENSITY_OPTIONS.map((opt) => {
                const active = appearance.cardSize === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleManualCardSizeChange(opt.value)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition relative overflow-hidden",
                      active
                        ? "border-teal-600 bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
                        : "border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800",
                    )}
                  >
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <FieldRow
              label="Altura dos slots"
              description="Ajusta a altura de cada faixa horária"
              control={
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={appearance.heightScale}
                    onChange={(e) => handleHeightScaleChange(Number(e.target.value))}
                    className="w-32 sm:w-40 accent-teal-600 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-6 text-right">
                    {appearance.heightScale}
                  </span>
                </div>
              }
            />

            <FieldRow
              label="Tamanho da fonte"
              description="Escala o texto dentro dos cards"
              control={
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={appearance.fontScale}
                    onChange={(e) => setFontScale(Number(e.target.value))}
                    className="w-32 sm:w-40 accent-teal-600 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-6 text-right">
                    {appearance.fontScale}
                  </span>
                </div>
              }
            />

            <FieldRow
              label="Opacidade dos cards"
              description="Controla a transparência dos cards de agendamento"
              control={
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={appearance.opacity ?? 100}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-32 sm:w-40 accent-teal-600 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-6 text-right">
                    {appearance.opacity ?? 100}%
                  </span>
                </div>
              }
            />
          </div>

          {/* Rodapé de Ações */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() =>
                applyToAllViews({
                  cardSize: appearance.cardSize,
                  heightScale: appearance.heightScale,
                  fontScale: appearance.fontScale,
                  opacity: appearance.opacity ?? 100,
                })
              }
              className="text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              Aplicar a todas as visualizações
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button
              type="button"
              onClick={() => resetView()}
              className="text-xs font-medium text-slate-600 hover:underline dark:text-slate-400"
            >
              Restaurar esta visão
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button
              type="button"
              onClick={() => {
                if (confirm("Restaurar todos os ajustes de aparência?")) {
                  resetAll();
                  setAutoAdjust(true);
                  localStorage.setItem("agenda_appearance_auto_adjust", "true");
                }
              }}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Resetar tudo
            </button>
          </div>
        </div>

        {/* Coluna da Direita: Pré-visualização Sólida */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold">Pré-visualização em Tempo Real</h4>
                <p className="text-xs text-muted-foreground">
                  Veja como os cards serão exibidos no layout de{" "}
                  <strong>{activeView === "day" ? "Dia" : activeView === "week" ? "Semana" : "Mês"}</strong>.
                </p>
              </div>

              {/* Box de Preview Sólido */}
              <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-2 shadow-sm">
                <LiveViewPreview appearance={appearance} view={activeView} />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-muted-foreground flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Altura da faixa horária:</span>
                <span className="font-mono">{slotHeightPx}px</span>
              </div>
              <div className="flex justify-between">
                <span>Escala do texto dos cards:</span>
                <span className="font-mono">{fontPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span>Opacidade dos cards:</span>
                <span className="font-mono">{(appearance.opacity ?? 100) / 100}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
