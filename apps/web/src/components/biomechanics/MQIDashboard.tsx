import React from "react";

export interface MQIDashboardProps {
  mqiScore?: number;
  symmetryScore?: number;
  romScore?: number;
  stabilityScore?: number;
  angles?: Record<string, number>;
  clinicalHighlights?: string[];
  patientName?: string;
}

export const MQIDashboard: React.FC<MQIDashboardProps> = ({
  mqiScore = 86,
  symmetryScore = 92,
  romScore = 84,
  stabilityScore = 82,
  angles = {
    leftKnee: 94.5,
    rightKnee: 98.2,
    leftHip: 102.1,
    rightHip: 104.0,
    trunkInclination: 12.4,
  },
  clinicalHighlights = [
    "Excelente simetria de carga e angulação bilateral (92%).",
    "Padrão de movimento de alta qualidade (MQI > 80).",
    "Amplitude de flexão de joelho preservada acima de 90°.",
  ],
  patientName = "Paciente",
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 60) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-rose-400 border-rose-500/30 bg-rose-500/10";
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
              VISION AI ENGINE V2
            </span>
            <span className="text-xs text-slate-400">Cinemática Avançada</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Movement Quality Index (MQI) — {patientName}
          </h2>
        </div>

        {/* Global Gauge Badge */}
        <div className="flex items-center space-x-3">
          <div className={`flex flex-col items-center px-4 py-2 rounded-xl border ${getScoreColor(mqiScore)}`}>
            <span className="text-2xl font-black tracking-tight">{mqiScore}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">MQI Score</span>
          </div>
        </div>
      </div>

      {/* 4 Core Pillars Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Simetria Bilateral</span>
            <span className="font-semibold text-slate-200">{symmetryScore}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${symmetryScore}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Amplitude (ROM)</span>
            <span className="font-semibold text-slate-200">{romScore}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${romScore}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Estabilidade</span>
            <span className="font-semibold text-slate-200">{stabilityScore}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${stabilityScore}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Controle Motor</span>
            <span className="font-semibold text-slate-200">{Math.round((romScore + stabilityScore) / 2)}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round((romScore + stabilityScore) / 2)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Joint Angles Table */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Goniometria Computacional (Ângulos de Vértice)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(angles).map(([key, val]) => (
            <div key={key} className="bg-slate-900 border border-slate-800/80 p-3 rounded-lg text-center">
              <span className="block text-[11px] text-slate-400 capitalize">
                {key.replace(/([A-Z])/g, " $1")}
              </span>
              <span className="text-base font-bold text-teal-300">{val}°</span>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Highlights */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
          <span>🩺 Destaques da Análise Visual</span>
        </h4>
        <ul className="space-y-1.5 text-xs text-slate-300">
          {clinicalHighlights.map((item, idx) => (
            <li key={idx} className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
