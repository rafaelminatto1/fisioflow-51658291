import { SlidersHorizontal } from "lucide-react";
import { SectionCard } from "../shared/SectionCard";
import { FieldRow } from "../shared/FieldRow";
import { cn } from "@/lib/utils";
import { useAgendaAppearancePersistence } from "@/hooks/useAgendaAppearancePersistence";

type CardSize = "extra_small" | "small" | "medium" | "large";

const DENSITY_OPTIONS: Array<{ value: CardSize; label: string; description: string }> = [
  { value: "extra_small", label: "Mínimo", description: "Máxima densidade" },
  { value: "small", label: "Compacto", description: "Vê mais sem rolar" },
  { value: "medium", label: "Balanceado", description: "Padrão recomendado" },
  { value: "large", label: "Espaçoso", description: "Mais respiro visual" },
];

export function AparenciaTab() {
  const { appearance, setCardSize, setHeightScale, setFontScale, applyToAllViews, resetView, resetAll } =
    useAgendaAppearancePersistence("week");

  return (
    <SectionCard
      icon={<SlidersHorizontal className="h-4 w-4" />}
      title="Aparência da Agenda"
      description="Densidade, altura dos cards e escala de fonte"
    >
      <div className="space-y-5">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Densidade</p>
          <div className="grid gap-2 sm:grid-cols-4">
            {DENSITY_OPTIONS.map((opt) => {
              const active = appearance.cardSize === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCardSize(opt.value)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition",
                    active
                      ? "border-teal-600 bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
                      : "border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/50 dark:border-slate-700 dark:bg-slate-900",
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
          label="Altura dos slots"
          description="Ajusta a altura de cada faixa horária"
          control={
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={appearance.heightScale}
              onChange={(e) => setHeightScale(Number(e.target.value))}
              className="w-40 accent-teal-600"
            />
          }
        />

        <FieldRow
          label="Tamanho da fonte"
          description="Escala o texto dentro dos cards"
          control={
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={appearance.fontScale}
              onChange={(e) => setFontScale(Number(e.target.value))}
              className="w-40 accent-teal-600"
            />
          }
        />

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() =>
              applyToAllViews({
                cardSize: appearance.cardSize,
                heightScale: appearance.heightScale,
                fontScale: appearance.fontScale,
                opacity: appearance.opacity,
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
              if (confirm("Restaurar todos os ajustes de aparência?")) resetAll();
            }}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Resetar tudo
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
