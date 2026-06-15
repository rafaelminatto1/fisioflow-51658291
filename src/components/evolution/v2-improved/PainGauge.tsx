import { memo } from "react";

/** Cor da dor por nível (verde → amarelo → laranja → vermelho → vinho). */
export function painColor(level: number): string {
  const l = Math.max(0, Math.min(10, level));
  if (l <= 2) return "hsl(142 71% 45%)";
  if (l <= 4) return "hsl(38 92% 50%)";
  if (l <= 6) return "hsl(25 95% 53%)";
  if (l <= 8) return "hsl(0 84% 60%)";
  return "hsl(0 63% 31%)";
}

export function painLabel(level: number): string {
  const l = Math.max(0, Math.min(10, level));
  if (l === 0) return "Sem dor";
  if (l <= 2) return "Leve";
  if (l <= 4) return "Leve-moderada";
  if (l <= 6) return "Moderada";
  if (l <= 8) return "Intensa";
  return "Máxima";
}

const CX = 130;
const CY = 130;
const R = 104;
const ARC_LEN = Math.PI * R; // ~326.7

/** Posição (x,y) de um ponto na fração f (0=esquerda, 1=direita) do semicírculo. */
function pointAt(f: number): { x: number; y: number } {
  const angle = ((180 - 180 * f) * Math.PI) / 180;
  return { x: CX + R * Math.cos(angle), y: CY - R * Math.sin(angle) };
}

interface PainGaugeProps {
  /** Valor principal exibido ao centro (saída). */
  value: number;
  /** Marcador fantasma da dor de chegada. */
  arrival?: number;
}

/** Medidor radial da EVA (Layout E — dor-cêntrico). */
export const PainGauge = memo(({ value, arrival }: PainGaugeProps) => {
  const v = Math.max(0, Math.min(10, value));
  const f = v / 10;
  const dash = `${(ARC_LEN * f).toFixed(1)} ${ARC_LEN.toFixed(1)}`;
  const saida = pointAt(f);
  const chegada = arrival != null ? pointAt(Math.max(0, Math.min(10, arrival)) / 10) : null;

  return (
    <div className="relative mx-auto w-[260px] max-w-full">
      <svg viewBox="0 0 260 158" className="w-full h-auto">
        <defs>
          <linearGradient id="paingauge-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#22c55e" />
            <stop offset="0.5" stopColor="#eab308" />
            <stop offset="0.8" stopColor="#ef4444" />
            <stop offset="1" stopColor="#7f1d1d" />
          </linearGradient>
        </defs>
        {/* trilho */}
        <path
          d="M 26 130 A 104 104 0 0 1 234 130"
          fill="none"
          stroke="hsl(220 14% 92%)"
          strokeWidth={16}
          strokeLinecap="round"
        />
        {/* valor */}
        <path
          d="M 26 130 A 104 104 0 0 1 234 130"
          fill="none"
          stroke="url(#paingauge-grad)"
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={dash}
          style={{ transition: "stroke-dasharray .35s ease" }}
        />
        {/* marcador chegada (fantasma) */}
        {chegada && (
          <circle cx={chegada.x} cy={chegada.y} r={9} fill="#fff" stroke="hsl(0 70% 55%)" strokeWidth={3} />
        )}
        {/* marcador saída */}
        <circle cx={saida.x} cy={saida.y} r={9} fill={painColor(v)} stroke="#fff" strokeWidth={3} />
      </svg>
      <div className="absolute inset-x-0 bottom-0.5 text-center">
        <div
          className="text-[52px] font-extrabold leading-none tracking-tight tabular-nums"
          style={{ color: painColor(v) }}
        >
          {v}
          <span className="text-[20px] font-bold text-muted-foreground">/10</span>
        </div>
        <div className="mt-0.5 text-xs font-extrabold" style={{ color: painColor(v) }}>
          {painLabel(v)}
        </div>
      </div>
    </div>
  );
});

PainGauge.displayName = "PainGauge";
