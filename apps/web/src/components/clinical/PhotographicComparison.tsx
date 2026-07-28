import React, { useState } from "react";

export interface PhotoRecord {
  id: string;
  url: string;
  date: string;
  label: string;
  shoulderAngle?: number;
  hipAngle?: number;
  cobbAngleEstimate?: number;
}

export interface PhotographicComparisonProps {
  beforePhoto?: PhotoRecord;
  afterPhoto?: PhotoRecord;
  patientName?: string;
}

export const PhotographicComparison: React.FC<PhotographicComparisonProps> = ({
  beforePhoto = {
    id: "p1",
    url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80",
    date: "10/06/2026",
    label: "Avaliação Inicial (Sessão 1)",
    shoulderAngle: 6.4,
    hipAngle: 4.1,
    cobbAngleEstimate: 14.2,
  },
  afterPhoto = {
    id: "p2",
    url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80",
    date: "24/07/2026",
    label: "Reavaliação (Sessão 12)",
    shoulderAngle: 1.8,
    hipAngle: 1.2,
    cobbAngleEstimate: 8.5,
  },
  patientName = "Paciente",
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showAngles, setShowAngles] = useState<boolean>(true);

  const shoulderDiff = Math.abs((beforePhoto.shoulderAngle || 0) - (afterPhoto.shoulderAngle || 0));
  const cobbDiff = Math.abs((beforePhoto.cobbAngleEstimate || 0) - (afterPhoto.cobbAngleEstimate || 0));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            EVOLUÇÃO FOTOGRÁFICA
          </span>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Comparativo de Postura & Alinhamento — {patientName}
          </h2>
        </div>

        {/* Overlay Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              showGrid ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" : "bg-slate-800 text-slate-400"
            }`}
          >
            📐 Grelha de Postura
          </button>
          <button
            onClick={() => setShowAngles(!showAngles)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              showAngles ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-slate-400"
            }`}
          >
            📏 Ângulos Visuais
          </button>
        </div>
      </div>

      {/* Interactive Split / Overlay Viewer */}
      <div className="relative w-full h-[400px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 select-none">
        {/* Before Image (Full width background) */}
        <div className="absolute inset-0">
          <img
            src={beforePhoto.url}
            alt={beforePhoto.label}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-md text-xs border border-slate-800 text-amber-400 font-medium">
            ANTES: {beforePhoto.date} ({beforePhoto.label})
          </div>
        </div>

        {/* After Image (Clipped overlay) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={afterPhoto.url}
            alt={afterPhoto.label}
            className="w-full h-full object-cover max-w-none"
            style={{ width: "100%", height: "100%" }}
          />
          <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-md text-xs border border-slate-800 text-emerald-400 font-medium whitespace-nowrap">
            DEPOIS: {afterPhoto.date} ({afterPhoto.label})
          </div>
        </div>

        {/* Optional Posture Grid Lines */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-6 grid-rows-6 opacity-30">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className="border border-teal-500/40" />
            ))}
          </div>
        )}

        {/* Vertical Divider & Slider Controller */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-teal-400 cursor-ew-resize z-20"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-slate-900 border-2 border-teal-400 rounded-full flex items-center justify-center text-teal-400 shadow-lg text-xs font-bold">
            ↔
          </div>
        </div>

        {/* Hidden Range Input overlay */}
        <input
          type="range"
          min={0}
          max={100}
          value={sliderPosition}
          onChange={(e) => setSliderPosition(Number(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-30"
        />
      </div>

      {/* Metrics Summary Comparison Table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400">Inclinação Ombro (Desvio)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-amber-400">{beforePhoto.shoulderAngle}° → {afterPhoto.shoulderAngle}°</span>
            <span className="text-xs text-emerald-400 font-bold">-{shoulderDiff.toFixed(1)}° melhora</span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400">Estimativa Ângulo Cobb</span>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-amber-400">{beforePhoto.cobbAngleEstimate}° → {afterPhoto.cobbAngleEstimate}°</span>
            <span className="text-xs text-emerald-400 font-bold">-{cobbDiff.toFixed(1)}° melhora</span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400">Alinhamento Pélvico</span>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-slate-200">{beforePhoto.hipAngle}° → {afterPhoto.hipAngle}°</span>
            <span className="text-xs text-teal-400 font-bold">Simétrico</span>
          </div>
        </div>
      </div>
    </div>
  );
};
