import { memo } from "react";
import { painColor } from "./PainGauge";

export interface PainTrendPoint {
  label: string;
  level: number;
}

interface PainTrendSparklineProps {
  data: PainTrendPoint[];
  /** Meta/target de dor (linha tracejada de projeção). */
  meta?: number;
  /** Classe de altura do SVG (default h-24). */
  heightClass?: string;
}

const W = 300;
const H = 96;
const PAD_X = 20;
const PLOT_TOP = 14;
const PLOT_H = 70;

function y(level: number): number {
  const l = Math.max(0, Math.min(10, level));
  return PLOT_TOP + (1 - l / 10) * PLOT_H;
}

/** Mini-gráfico SVG de tendência da dor por sessão (Layout E). */
export const PainTrendSparkline = memo(({ data, meta, heightClass = "h-24" }: PainTrendSparklineProps) => {
  if (data.length === 0) {
    return (
      <div className="flex h-16 items-center justify-center text-[11px] font-semibold text-muted-foreground">
        Sem histórico de dor ainda.
      </div>
    );
  }

  const n = data.length;
  const step = n > 1 ? (W - PAD_X * 2) / (n - 1) : 0;
  const pts = data.map((d, i) => ({ ...d, x: PAD_X + i * step, cy: y(d.level) }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.cy.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const area = `${line} L ${last.x.toFixed(1)} ${(H - 4).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(H - 4).toFixed(1)} Z`;
  const metaPoint = meta != null ? { x: Math.min(W - 5, last.x + step * 0.6), cy: y(meta) } : null;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`${heightClass} w-full`}>
        <g stroke="hsl(220 13% 91%)" strokeWidth={1}>
          <line x1={0} y1={20} x2={W} y2={20} />
          <line x1={0} y1={50} x2={W} y2={50} />
          <line x1={0} y1={80} x2={W} y2={80} />
        </g>
        <path d={area} fill="hsl(var(--primary) / 0.08)" stroke="none" />
        <path
          d={line}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {metaPoint && (
          <path
            d={`M ${last.x.toFixed(1)} ${last.cy.toFixed(1)} L ${metaPoint.x.toFixed(1)} ${metaPoint.cy.toFixed(1)}`}
            fill="none"
            stroke="hsl(var(--primary) / .4)"
            strokeWidth={3}
            strokeDasharray="3 4"
            strokeLinecap="round"
          />
        )}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.cy} r={i === n - 1 ? 5 : 4} fill={painColor(p.level)} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-bold text-muted-foreground">
        {data.map((d, i) => (
          <span key={i}>
            {d.label} · {d.level}
          </span>
        ))}
        {meta != null && <span className="text-primary">meta · {meta}</span>}
      </div>
    </div>
  );
});

PainTrendSparkline.displayName = "PainTrendSparkline";
