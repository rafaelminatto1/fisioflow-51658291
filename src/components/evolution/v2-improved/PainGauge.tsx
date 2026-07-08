import { memo, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

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
  /** Versão reduzida (menor altura) para colunas estreitas. */
  compact?: boolean;
  /** Quando informado, o medidor vira clicável/arrastável e atualiza a saída. */
  onChange?: (value: number) => void;
  /** Mostra arco de conexão entre chegada e saída com cor dinâmica. */
  showDeltaArc?: boolean;
  /** Tooltip com valores exatos ao passar o mouse nos marcadores. */
  showTooltips?: boolean;
  /** Qual valor exibir em destaque e alterar no onChange. */
  activeMode?: 'arrival' | 'discharge';
  /** Callback para alterar modo ativo (Entrada / Saída). */
  onModeChange?: (mode: 'arrival' | 'discharge') => void;
}

/** Medidor radial da EVA (Layout E — dor-cêntrico). */
export const PainGauge = memo(({ value, arrival, compact, onChange, showDeltaArc = true, showTooltips = true, activeMode, onModeChange }: PainGaugeProps) => {
  const arrV = arrival != null ? Math.max(0, Math.min(10, arrival)) : null;
  const disV = Math.max(0, Math.min(10, value));

  const isArrivalActive = activeMode === "arrival";
  const v = isArrivalActive && arrV != null ? arrV : disV;
  const f = v / 10;
  const dash = `${(ARC_LEN * f).toFixed(1)} ${ARC_LEN.toFixed(1)}`;
  const activePoint = pointAt(f);

  const ghostV = isArrivalActive ? disV : arrV;
  const ghostPoint = ghostV != null ? pointAt(ghostV / 10) : null;

  const arrPoint = arrV != null ? pointAt(arrV / 10) : null;
  const disPoint = pointAt(disV / 10);

  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  // Converte a posição do ponteiro no arco em um valor 0–10.
  const valueFromPointer = useCallback((clientX: number, clientY: number): number | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const vx = ((clientX - rect.left) / rect.width) * 260;
    const vy = ((clientY - rect.top) / rect.height) * 158;
    const dx = vx - CX;
    const dy = CY - vy; // y do SVG cresce para baixo
    let ang = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180
    if (ang < 0) ang = dx < 0 ? 180 : 0; // abaixo da linha → extremo mais próximo
    ang = Math.max(0, Math.min(180, ang));
    const frac = (180 - ang) / 180; // 0 à esquerda, 1 à direita
    return Math.round(frac * 10);
  }, []);

  const apply = useCallback(
    (e: React.PointerEvent) => {
      if (!onChange) return;
      const nv = valueFromPointer(e.clientX, e.clientY);
      if (nv != null) onChange(nv);
    },
    [onChange, valueFromPointer],
  );

  return (
    <div className={cn("relative mx-auto max-w-full", compact ? "w-[156px]" : "w-[260px]")}>
      <svg
        ref={svgRef}
        viewBox="0 0 260 158"
        className={cn("w-full h-auto", onChange && "cursor-pointer touch-none")}
        onPointerDown={
          onChange
            ? (e) => {
                draggingRef.current = true;
                (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
                apply(e);
              }
            : undefined
        }
        onPointerMove={onChange ? (e) => draggingRef.current && apply(e) : undefined}
        onPointerUp={onChange ? () => (draggingRef.current = false) : undefined}
      >
        {/* trilho */}
        <path
          d="M 26 130 A 104 104 0 0 1 234 130"
          fill="none"
          stroke="hsl(220 14% 92%)"
          strokeWidth={16}
          strokeLinecap="round"
        />
        {/* valor — cor sólida do nível de SAÍDA daquela sessão */}
        <path
          d="M 26 130 A 104 104 0 0 1 234 130"
          fill="none"
          stroke={painColor(v)}
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={dash}
          style={{ transition: "stroke-dasharray .35s ease, stroke .35s ease" }}
        />
        {/* Arco de conexão Chegada → Saída (T009, T010) */}
        {showDeltaArc && arrPoint && arrV !== disV && (
          <path
            d={`M ${arrPoint.x} ${arrPoint.y} Q ${(arrPoint.x + disPoint.x) / 2} ${(arrPoint.y + disPoint.y) / 2 - 20} ${disPoint.x} ${disPoint.y}`}
            fill="none"
            stroke={disV <= (arrV ?? 0) ? "hsl(142 71% 45%)" : "hsl(0 84% 60%)"}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="6 3"
            opacity={0.7}
            style={{ transition: "stroke .35s ease" }}
          />
        )}
        {/* marcador secundário (fantasma, colorido pelo próprio nível) */}
        {ghostPoint && ghostV != null && (
          <g>
            {showTooltips && (
              <title>{isArrivalActive ? "Saída" : "Chegada"}: {ghostV}/10 ({painLabel(ghostV)})</title>
            )}
            <circle
              cx={ghostPoint.x}
              cy={ghostPoint.y}
              r={9}
              fill="#fff"
              stroke={painColor(ghostV)}
              strokeWidth={3}
            />
            {ghostV !== v && (
              <text
                x={ghostPoint.x}
                y={ghostPoint.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7"
                fontWeight="bold"
                fill={painColor(ghostV)}
              >
                {ghostV}
              </text>
            )}
          </g>
        )}
        {/* marcador ativo */}
        <g>
          {showTooltips && (
            <title>{isArrivalActive ? "Chegada" : "Saída"}: {v}/10 ({painLabel(v)})</title>
          )}
          <circle cx={activePoint.x} cy={activePoint.y} r={9} fill={painColor(v)} stroke="#fff" strokeWidth={3} />
        </g>
      </svg>
      <div className={cn("pointer-events-none absolute inset-x-0 text-center flex flex-col items-center", compact ? "bottom-1.5" : "bottom-0.5")}>
        <div
          className={cn(
            "font-extrabold leading-none tracking-tight tabular-nums",
            compact ? "text-[28px]" : "text-[52px]",
          )}
          style={{ color: painColor(v) }}
        >
          {v}
          <span
            className={cn("font-bold text-muted-foreground", compact ? "text-[12px]" : "text-[20px]")}
          >
            /10
          </span>
        </div>
        
        {activeMode && onModeChange && (
          <div className="mt-1 pointer-events-auto flex items-center bg-slate-100 rounded-full p-0.5">
            <button
              onClick={() => onModeChange('arrival')}
              className={cn("px-2 py-[1px] rounded-full text-[9px] font-bold transition-colors", isArrivalActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              ENTRADA
            </button>
            <button
              onClick={() => onModeChange('discharge')}
              className={cn("px-2 py-[1px] rounded-full text-[9px] font-bold transition-colors", !isArrivalActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              SAÍDA
            </button>
          </div>
        )}

        {!activeMode && (
          <div
            className={cn("font-extrabold", compact ? "text-[9px]" : "mt-0.5 text-xs")}
            style={{ color: painColor(v) }}
          >
            {painLabel(v)}
          </div>
        )}
      </div>
    </div>
  );
});

PainGauge.displayName = "PainGauge";
