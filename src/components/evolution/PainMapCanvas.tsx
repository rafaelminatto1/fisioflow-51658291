import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type {
  PainMapPoint,
  PainIntensity,
  PainType,
  BodyRegion,
  PainEvolutionData,
} from "@/types/painMap";
import { BodyMapRealistic } from "@/components/pain-map/BodyMapRealistic";
import { PainPoint } from "@/components/pain-map/BodyMap";

interface PainMapCanvasProps {
  painPoints: PainMapPoint[];
  onPainPointsChange: (points: PainMapPoint[]) => void;
  readOnly?: boolean;
  variant?: "2d" | "3d";
  evolutionData?: PainEvolutionData[];
  selectedRegion?: BodyRegion | null;
  onRegionSelect?: (region: BodyRegion | null) => void;
}

// Realistic SVG paths for human body silhouette - FRONT VIEW
const frontPaths: Partial<Record<BodyRegion, { path: string; centerX: number; centerY: number }>> =
  {
    // Head Split
    cabeca_frente_direita: {
      path: "M50,5 C42,5 36,12 36,22 C36,32 42,38 50,38 L50,5 Z", // Left side of screen (Patient Right)
      centerX: 43,
      centerY: 20,
    },
    cabeca_frente_esquerda: {
      path: "M50,5 L50,38 C58,38 64,32 64,22 C64,12 58,5 50,5 Z", // Right side of screen (Patient Left)
      centerX: 57,
      centerY: 20,
    },

    // Neck Split
    pescoco_frontal_direito: {
      path: "M50,38 L50,48 L44,48 L45,38 C45,38 47,40 50,40 L50,38 Z",
      centerX: 47,
      centerY: 44,
    },
    pescoco_frontal_esquerdo: {
      path: "M50,38 C53,38 55,40 55,40 L56,48 L50,48 L50,38 Z",
      centerX: 53,
      centerY: 44,
    },

    ombro_direito: {
      path: "M44,48 L44,52 C40,52 32,54 28,58 L26,54 C30,50 38,48 44,48 Z",
      centerX: 35,
      centerY: 52,
    },
    ombro_esquerdo: {
      path: "M56,48 L56,52 C60,52 68,54 72,58 L74,54 C70,50 62,48 56,48 Z",
      centerX: 65,
      centerY: 52,
    },

    // Thorax Split
    torax_direito: {
      path: "M44,48 L50,48 L50,75 L40,75 L42,52 L44,48 Z",
      centerX: 45,
      centerY: 62,
    },
    torax_esquerdo: {
      path: "M50,48 L56,48 L58,52 L60,75 L50,75 L50,48 Z",
      centerX: 55,
      centerY: 62,
    },

    braco_direito: {
      path: "M28,58 L26,54 L22,58 L20,80 L26,82 L30,62 Z",
      centerX: 24,
      centerY: 68,
    },
    braco_esquerdo: {
      path: "M72,58 L74,54 L78,58 L80,80 L74,82 L70,62 Z",
      centerX: 76,
      centerY: 68,
    },
    antebraco_direito: {
      path: "M20,80 L26,82 L24,105 L16,103 Z",
      centerX: 21,
      centerY: 92,
    },
    antebraco_esquerdo: {
      path: "M80,80 L74,82 L76,105 L84,103 Z",
      centerX: 79,
      centerY: 92,
    },
    mao_direita: {
      path: "M16,103 L24,105 L25,115 C25,118 22,120 18,120 C14,120 12,117 13,114 Z",
      centerX: 19,
      centerY: 112,
    },
    mao_esquerda: {
      path: "M84,103 L76,105 L75,115 C75,118 78,120 82,120 C86,120 88,117 87,114 Z",
      centerX: 81,
      centerY: 112,
    },

    // Abdomen Split
    abdomen_direito: {
      path: "M40,75 L50,75 L50,95 L42,95 L40,75 Z",
      centerX: 45,
      centerY: 85,
    },
    abdomen_esquerdo: {
      path: "M50,75 L60,75 L58,95 L50,95 L50,75 Z",
      centerX: 55,
      centerY: 85,
    },

    // Hips
    quadril_direito: {
      path: "M42,95 L50,95 L50,118 L40,118 C38,114 40,110 42,95 Z",
      centerX: 45,
      centerY: 106,
    },
    quadril_esquerdo: {
      path: "M50,95 L58,95 C60,100 62,114 60,118 L50,118 L50,95 Z",
      centerX: 55,
      centerY: 106,
    },

    coxa_direita: {
      path: "M40,118 L50,118 L48,155 L38,155 Z",
      centerX: 44,
      centerY: 136,
    },
    coxa_esquerda: {
      path: "M50,118 L60,118 L62,155 L52,155 Z",
      centerX: 56,
      centerY: 136,
    },
    joelho_direito: {
      path: "M38,155 L48,155 L47,170 L37,170 C36,165 36,160 38,155 Z",
      centerX: 42,
      centerY: 162,
    },
    joelho_esquerdo: {
      path: "M52,155 L62,155 C64,160 64,165 63,170 L53,170 Z",
      centerX: 58,
      centerY: 162,
    },
    perna_direita: {
      path: "M37,170 L47,170 L45,205 L35,205 Z",
      centerX: 41,
      centerY: 188,
    },
    perna_esquerda: {
      path: "M53,170 L63,170 L65,205 L55,205 Z",
      centerX: 59,
      centerY: 188,
    },
    tornozelo_direito: {
      path: "M35,205 L45,205 L44,215 L34,215 Z",
      centerX: 39,
      centerY: 210,
    },
    tornozelo_esquerdo: {
      path: "M55,205 L65,205 L66,215 L56,215 Z",
      centerX: 61,
      centerY: 210,
    },
    pe_direito: {
      path: "M30,215 L44,215 L44,222 C44,226 40,228 35,228 L32,228 C28,228 26,224 28,220 Z",
      centerX: 36,
      centerY: 222,
    },
    pe_esquerdo: {
      path: "M56,215 L70,215 L72,220 C74,224 72,228 68,228 L65,228 C60,228 56,226 56,222 Z",
      centerX: 64,
      centerY: 222,
    },
  };

// Realistic SVG paths for human body silhouette - BACK VIEW
const backPaths: Partial<Record<BodyRegion, { path: string; centerX: number; centerY: number }>> = {
  cabeca_nuca_esquerda: {
    path: "M50,5 L50,38 C42,38 36,32 36,22 C36,12 42,5 50,5 Z",
    centerX: 43,
    centerY: 20,
  },
  cabeca_nuca_direita: {
    path: "M50,5 C58,5 64,12 64,22 C64,32 58,38 50,38 L50,5 Z",
    centerX: 57,
    centerY: 20,
  },
  pescoco_nuca_esquerdo: {
    path: "M50,38 L50,48 L44,48 C44,48 42,40 50,38 Z",
    centerX: 47,
    centerY: 44,
  },
  pescoco_nuca_direito: {
    path: "M50,38 C58,40 56,48 56,48 L50,48 L50,38 Z",
    centerX: 53,
    centerY: 44,
  },
  ombro_esquerdo: {
    path: "M44,48 L44,52 C40,52 32,54 28,58 L26,54 C30,50 38,48 44,48 Z",
    centerX: 35,
    centerY: 52,
  },
  ombro_direito: {
    path: "M56,48 L56,52 C60,52 68,54 72,58 L74,54 C70,50 62,48 56,48 Z",
    centerX: 65,
    centerY: 52,
  },
  costas_superior_esquerda: {
    path: "M44,48 L50,48 L50,85 L40,85 L35,65 L44,48 Z",
    centerX: 45,
    centerY: 65,
  },
  costas_superior_direita: {
    path: "M50,48 L56,48 L65,65 L60,85 L50,85 L50,48 Z",
    centerX: 55,
    centerY: 65,
  },
  braco_esquerdo: {
    path: "M28,58 L26,54 L22,58 L20,80 L26,82 L30,62 Z",
    centerX: 24,
    centerY: 68,
  },
  braco_direito: {
    path: "M72,58 L74,54 L78,58 L80,80 L74,82 L70,62 Z",
    centerX: 76,
    centerY: 68,
  },
  antebraco_esquerdo: {
    path: "M20,80 L26,82 L24,105 L16,103 Z",
    centerX: 21,
    centerY: 92,
  },
  antebraco_direito: {
    path: "M80,80 L74,82 L76,105 L84,103 Z",
    centerX: 79,
    centerY: 92,
  },
  mao_esquerda: {
    path: "M16,103 L24,105 L25,115 C25,118 22,120 18,120 C14,120 12,117 13,114 Z",
    centerX: 19,
    centerY: 112,
  },
  mao_direita: {
    path: "M84,103 L76,105 L75,115 C75,118 78,120 82,120 C86,120 88,117 87,114 Z",
    centerX: 81,
    centerY: 112,
  },
  lombar_esquerda: {
    path: "M40,85 L50,85 L50,105 L42,105 Z",
    centerX: 45,
    centerY: 95,
  },
  lombar_direita: {
    path: "M50,85 L60,85 L58,105 L50,105 Z",
    centerX: 55,
    centerY: 95,
  },
  gluteo_esquerdo: {
    path: "M42,105 L50,105 L50,125 L38,125 C36,115 38,110 42,105 Z",
    centerX: 44,
    centerY: 115,
  },
  gluteo_direito: {
    path: "M50,105 L58,105 C62,110 64,115 62,125 L50,125 L50,105 Z",
    centerX: 56,
    centerY: 115,
  },
  coxa_esquerda: {
    path: "M38,125 L50,125 L48,160 L36,160 Z",
    centerX: 44,
    centerY: 142,
  },
  coxa_direita: {
    path: "M50,125 L62,125 L64,160 L52,160 Z",
    centerX: 56,
    centerY: 142,
  },
  joelho_esquerdo: {
    path: "M36,160 L48,160 L47,175 L35,175 Z",
    centerX: 42,
    centerY: 167,
  },
  joelho_direito: {
    path: "M52,160 L64,160 L63,175 L51,175 Z",
    centerX: 58,
    centerY: 167,
  },
  panturrilha_esquerda: {
    path: "M35,175 L47,175 L45,210 L33,210 Z",
    centerX: 40,
    centerY: 192,
  },
  panturrilha_direita: {
    path: "M53,175 L65,175 L67,210 L55,210 Z",
    centerX: 60,
    centerY: 192,
  },
  tornozelo_esquerdo: {
    path: "M33,210 L45,210 L44,220 L32,220 Z",
    centerX: 38,
    centerY: 215,
  },
  tornozelo_direito: {
    path: "M55,210 L67,210 L68,220 L56,220 Z",
    centerX: 62,
    centerY: 215,
  },
  pe_esquerdo: {
    path: "M32,220 L44,220 L44,228 L30,228 Z",
    centerX: 37,
    centerY: 224,
  },
  pe_direito: {
    path: "M56,220 L68,220 L70,228 L56,228 Z",
    centerX: 63,
    centerY: 224,
  },
};

export function PainMapCanvas({
  painPoints,
  onPainPointsChange,
  readOnly = false,
  variant = "2d",
  evolutionData,
  selectedRegion: externalSelectedRegion,
  onRegionSelect,
}: PainMapCanvasProps) {
  const [internalSelectedRegion, setInternalSelectedRegion] = useState<BodyRegion | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<BodyRegion | null>(null);
  const [view, setView] = useState<"front" | "back">("front");

  const selectedRegion = externalSelectedRegion !== undefined ? externalSelectedRegion : internalSelectedRegion;

  const handleSetSelectedRegion = (region: BodyRegion | null) => {
    if (onRegionSelect) {
      onRegionSelect(region);
    } else {
      setInternalSelectedRegion(region);
    }
  };

  // Convert PainMapPoint to BodyMap PainPoint format
  const bodyMapPoints: PainPoint[] = painPoints
    .map((p) => {
      if (!p) return null;
      return {
        id: `point-${p.x}-${p.y}`,
        regionCode: p.region,
        region: p.region,
        intensity: p.intensity,
        painType: p.painType as PainPoint["painType"],
        notes: p.description,
        x: p.x,
        y: p.y,
      };
    })
    .filter(Boolean) as PainPoint[];

  const handleBodyMapPointAdd = (point: Omit<PainPoint, "id">) => {
    const newPoint: PainMapPoint = {
      region: point.regionCode as BodyRegion,
      intensity: point.intensity as PainIntensity,
      painType: point.painType as PainType,
      description: point.notes,
      x: point.x,
      y: point.y,
    };
    onPainPointsChange([...painPoints, newPoint]);
  };

  const handleBodyMapPointRemove = (pointId: string) => {
    const point = bodyMapPoints.find((p) => p.id === pointId);
    if (point) {
      onPainPointsChange(painPoints.filter((p) => p.x !== point.x || p.y !== point.y));
    }
  };

  const handleBodyMapPointUpdate = (point: PainPoint) => {
    const newPoints = painPoints.map((p) => {
      if (Math.abs(p.x - point.x) < 0.1 && Math.abs(p.y - point.y) < 0.1) {
        return {
          ...p,
          intensity: point.intensity as PainIntensity,
          painType: point.painType as PainType,
          description: point.notes,
        };
      }
      return p;
    });
    onPainPointsChange(newPoints);
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return "transparent";
    if (intensity <= 2) return "#22c55e";
    if (intensity <= 4) return "#84cc16";
    if (intensity <= 6) return "#eab308";
    if (intensity <= 8) return "#f97316";
    return "#ef4444";
  };

  if (variant === "3d") {
    return (
      <div className="w-full h-[750px] relative overflow-hidden rounded-2xl border border-border shadow-lg bg-black">
        <BodyMapRealistic
          view={view}
          points={bodyMapPoints}
          onPointAdd={handleBodyMapPointAdd}
          onPointRemove={handleBodyMapPointRemove}
          onPointUpdate={handleBodyMapPointUpdate}
          readOnly={readOnly}
          selectedIntensity={5}
          className="h-full w-full"
          onViewChange={(v) => setView(v)}
          evolutionData={evolutionData}
        />
      </div>
    );
  }

  const currentPaths = view === "front" ? frontPaths : backPaths;

  const handleRegionClick = (region: BodyRegion) => {
    if (readOnly) return;
    handleSetSelectedRegion(region);
  };

  return (
    <Card className="p-6 bg-gradient-to-b from-card to-card/90 border shadow-sm rounded-2xl flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Label className="block text-lg font-bold text-foreground">Mapa de Dor Corporal</Label>
          <p className="text-xs text-muted-foreground">Clique nas regiões para registrar ou editar a dor</p>
        </div>
        {!readOnly && (
          <div className="flex bg-muted/60 p-1 rounded-xl border border-border/50">
            <button
              onClick={() => setView("front")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                view === "front"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Frente
            </button>
            <button
              onClick={() => setView("back")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                view === "back"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Costas
            </button>
          </div>
        )}
      </div>

      <div className="relative bg-muted/20 border border-border/40 rounded-2xl p-6 flex items-center justify-center flex-1 min-h-[460px]">
        <svg
          viewBox="0 0 100 240"
          className="w-full max-w-[360px] mx-auto drop-shadow-xl transition-all duration-300"
          style={{ minHeight: "460px" }}
        >
          <defs>
            <linearGradient id="bodyFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.18" />
              <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.09" />
            </linearGradient>

            <linearGradient id="hoverFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            </linearGradient>

            <filter id="selectedGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="hsl(var(--primary))" floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <radialGradient key={i} id={`painGradient${i}`} cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor={getIntensityColor(i)} stopOpacity="0.95" />
                <stop offset="100%" stopColor={getIntensityColor(i)} stopOpacity="0.6" />
              </radialGradient>
            ))}

            <filter id="bodyShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
          </defs>

          <g filter="url(#bodyShadow)">
            {(Object.keys(currentPaths) as BodyRegion[]).map((region) => {
              const data = currentPaths[region];
              if (!data) return null;
              const { path } = data;
              return (
                <path
                  key={`outline-${region}`}
                  d={path}
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="0.4"
                  opacity="0.4"
                />
              );
            })}
          </g>

          {(Object.keys(currentPaths) as BodyRegion[]).map((region) => {
            const data = currentPaths[region];
            if (!data) return null;
            const { path, centerX, centerY } = data;

            const painPoint = painPoints.find((p) => p.region === region);
            const isSelected = selectedRegion === region;
            const isHovered = hoveredRegion === region;

            let fillColor = "url(#bodyFill)";
            if (painPoint && painPoint.intensity > 0) {
              fillColor = `url(#painGradient${painPoint.intensity})`;
            } else if (isHovered && !readOnly) {
              fillColor = "url(#hoverFill)";
            }

            return (
              <g key={region}>
                <path
                  d={path}
                  fill={fillColor}
                  stroke={
                    isSelected
                      ? "hsl(var(--primary))"
                      : isHovered
                        ? "hsl(var(--primary)/0.6)"
                        : "hsl(var(--border))"
                  }
                  strokeWidth={isSelected ? 1.8 : 0.6}
                  className={readOnly ? "" : "cursor-pointer transition-all duration-200"}
                  onClick={() => handleRegionClick(region)}
                  onMouseEnter={() => !readOnly && setHoveredRegion(region)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  filter={isSelected ? "url(#selectedGlow)" : undefined}
                />

                {painPoint && painPoint.intensity > 0 && (
                  <g className="pointer-events-none animate-scale-in">
                    <circle
                      cx={centerX}
                      cy={centerY}
                      r={6.5}
                      fill={getIntensityColor(painPoint.intensity)}
                      stroke="white"
                      strokeWidth={1.5}
                      className="drop-shadow-md"
                    />
                    <text
                      x={centerX}
                      y={centerY + 2.5}
                      fontSize="7"
                      fill="white"
                      textAnchor="middle"
                      fontWeight="bold"
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
                    >
                      {painPoint.intensity}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 p-3 bg-muted/30 rounded-xl border border-border/40">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Escala de Intensidade da Dor</p>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: "#22c55e" }} />
            <span className="text-[10px] text-muted-foreground font-medium">1-2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: "#84cc16" }} />
            <span className="text-[10px] text-muted-foreground font-medium">3-4</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: "#eab308" }} />
            <span className="text-[10px] text-muted-foreground font-medium">5-6</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: "#f97316" }} />
            <span className="text-[10px] text-muted-foreground font-medium">7-8</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: "#ef4444" }} />
            <span className="text-[10px] text-muted-foreground font-medium">9-10</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
