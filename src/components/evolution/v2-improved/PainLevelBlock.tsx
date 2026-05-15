/**
 * PainLevelBlock - EVA pain scale selector
 * Layout limpo: card de valor atual + barra gradiente + grid 0-10 + localização.
 */
import React from "react";
import { Smile, Meh, Frown, Angry, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface PainLevelBlockProps {
  painLevel?: number;
  painLocation?: string;
  onPainLevelChange: (level: number) => void;
  onPainLocationChange: (location: string) => void;
  disabled?: boolean;
}

const LEVEL_TIERS = [
  { max: 0, label: "Sem dor", icon: Smile, text: "text-emerald-600", chip: "bg-emerald-500 text-white", ring: "ring-emerald-200" },
  { max: 3, label: "Dor leve", icon: Meh, text: "text-lime-600", chip: "bg-lime-500 text-white", ring: "ring-lime-200" },
  { max: 6, label: "Dor moderada", icon: Frown, text: "text-amber-600", chip: "bg-amber-500 text-white", ring: "ring-amber-200" },
  { max: 10, label: "Dor intensa", icon: Angry, text: "text-rose-600", chip: "bg-rose-500 text-white", ring: "ring-rose-200" },
] as const;

function getTier(level: number) {
  for (const t of LEVEL_TIERS) if (level <= t.max) return t;
  return LEVEL_TIERS[LEVEL_TIERS.length - 1];
}

export const PainLevelBlock: React.FC<PainLevelBlockProps> = ({
  painLevel = 0,
  painLocation = "",
  onPainLevelChange,
  onPainLocationChange,
  disabled = false,
}) => {
  const tier = getTier(painLevel);
  const Icon = tier.icon;
  const percent = (painLevel / 10) * 100;

  return (
    <div className={cn("space-y-5 px-1", disabled && "opacity-60 pointer-events-none")}>
      {/* Current value */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "h-16 w-16 rounded-2xl flex items-center justify-center shadow-sm ring-2 ring-white",
            tier.chip,
          )}
        >
          <span className="text-3xl font-bold leading-none">{painLevel}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className={cn("flex items-center gap-1.5", tier.text)}>
            <Icon className="h-4 w-4" />
            <span className="text-sm font-semibold">{tier.label}</span>
          </div>
          <span className="text-xs text-slate-500">Escala de 0 a 10</span>
        </div>
      </div>

      {/* Gradient bar with thumb */}
      <div className="space-y-2">
        <div className="relative">
          <div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 shadow-inner" />
          <input
            type="range"
            min={0}
            max={10}
            value={painLevel}
            onChange={(e) => onPainLevelChange(Number(e.target.value))}
            disabled={disabled}
            aria-label="Nível de dor (0-10)"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-white shadow-md ring-2 transition-all",
              tier.ring,
            )}
            style={{ left: `${percent}%` }}
            aria-hidden
          />
        </div>
        <div className="flex justify-between text-[11px] font-medium text-slate-500">
          <span>Sem dor</span>
          <span>Moderada</span>
          <span>Máxima</span>
        </div>
      </div>

      {/* 0-10 chips */}
      <div>
        <p className="text-[11px] font-medium text-slate-500 mb-2">
          Selecione o nível de dor <span className="text-slate-400">(clique para selecionar)</span>
        </p>
        <div className="grid grid-cols-11 gap-1.5">
          {Array.from({ length: 11 }, (_, n) => n).map((n) => {
            const isActive = painLevel === n;
            const nTier = getTier(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => onPainLevelChange(n)}
                disabled={disabled}
                aria-label={`Nível ${n} — ${nTier.label}`}
                className={cn(
                  "h-9 rounded-full text-xs font-semibold border transition-all",
                  isActive
                    ? cn(nTier.chip, "border-transparent shadow-sm scale-105")
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pain location */}
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1.5 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Localização da dor <span className="text-slate-400">(opcional)</span>
        </label>
        <input
          type="text"
          value={painLocation}
          onChange={(e) => onPainLocationChange(e.target.value)}
          disabled={disabled}
          placeholder="Ex: Ombro direito, região anterior"
          className={cn(
            "w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white",
            "focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-300",
            "placeholder:text-slate-400 transition-colors",
            disabled && "cursor-not-allowed",
          )}
        />
      </div>
    </div>
  );
};
