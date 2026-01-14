import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PainMapPoint, PainIntensity, PainType, BodyRegion, PainEvolutionData } from '@/types/painMap';
import { PainMapService } from '@/lib/services/painMapService';
import { BodyMapRealistic } from '@/components/pain-map/BodyMapRealistic';
import { PainPoint } from '@/components/pain-map/BodyMap';
import { Badge } from '@/components/ui/badge';

interface PainMapCanvasProps {
  painPoints: PainMapPoint[];
  onPainPointsChange: (points: PainMapPoint[]) => void;
  readOnly?: boolean;
  variant?: '2d' | '3d';
  evolutionData?: PainEvolutionData[];
}

// Realistic SVG paths for human body silhouette - FRONT VIEW
const frontPaths: Partial<Record<BodyRegion, { path: string; centerX: number; centerY: number }>> = {
  // Head Split
  cabeca_frente_direita: {
    path: "M50,5 C42,5 36,12 36,22 C36,32 42,38 50,38 L50,5 Z", // Left side of screen (Patient Right)
    centerX: 43, centerY: 20
  },
  cabeca_frente_esquerda: {
    path: "M50,5 L50,38 C58,38 64,32 64,22 C64,12 58,5 50,5 Z", // Right side of screen (Patient Left)
    centerX: 57, centerY: 20
  },

  // Neck Split
  pescoco_frontal_direito: {
    path: "M50,38 L50,48 L44,48 L45,38 C45,38 47,40 50,40 L50,38 Z",
    centerX: 47, centerY: 44
  },
  pescoco_frontal_esquerdo: {
    path: "M50,38 C53,38 55,40 55,40 L56,48 L50,48 L50,38 Z",
    centerX: 53, centerY: 44
  },

  ombro_direito: {
    path: "M44,48 L44,52 C40,52 32,54 28,58 L26,54 C30,50 38,48 44,48 Z",
    centerX: 35, centerY: 52
  },
  ombro_esquerdo: {
    path: "M56,48 L56,52 C60,52 68,54 72,58 L74,54 C70,50 62,48 56,48 Z",
    centerX: 65, centerY: 52
  },

  // Thorax Split
  torax_direito: {
    path: "M44,48 L50,48 L50,75 L40,75 L42,52 L44,48 Z",
    centerX: 45, centerY: 62
  },
  torax_esquerdo: {
    path: "M50,48 L56,48 L58,52 L60,75 L50,75 L50,48 Z",
    centerX: 55, centerY: 62
  },

  braco_direito: {
    path: "M28,58 L26,54 L22,58 L20,80 L26,82 L30,62 Z",
    centerX: 24, centerY: 68
  },
  braco_esquerdo: {
    path: "M72,58 L74,54 L78,58 L80,80 L74,82 L70,62 Z",
    centerX: 76, centerY: 68
  },
  antebraco_direito: {
    path: "M20,80 L26,82 L24,105 L16,103 Z",
    centerX: 21, centerY: 92
  },
  antebraco_esquerdo: {
    path: "M80,80 L74,82 L76,105 L84,103 Z",
    centerX: 79, centerY: 92
  },
  mao_direita: {
    path: "M16,103 L24,105 L25,115 C25,118 22,120 18,120 C14,120 12,117 13,114 Z",
    centerX: 19, centerY: 112
  },
  mao_esquerda: {
    path: "M84,103 L76,105 L75,115 C75,118 78,120 82,120 C86,120 88,117 87,114 Z",
    centerX: 81, centerY: 112
  },

  // Abdomen Split
  abdomen_direito: {
    path: "M40,75 L50,75 L50,95 L42,95 L40,75 Z",
    centerX: 45, centerY: 85
  },
  abdomen_esquerdo: {
    path: "M50,75 L60,75 L58,95 L50,95 L50,75 Z",
    centerX: 55, centerY: 85
  },

  // Hips
  quadril_direito: {
    path: "M42,95 L50,95 L50,118 L40,118 C38,114 40,110 44,108 L42,95 Z", // Merged lumbar/hip area for front? Or keep separate?
    // Original had lumbar separate. But lumbar is back.
    // Let's assume generic "pelvis/hip" area.
    // Original lombar path: "M42,95 L58,95 L56,108 L44,108 Z" (Center Y 102)
    // Original quadril_direito: "M44,108 L50,108 L50,118 ..."
    // Effectively, Front doesn't have "Lumbar". It has "Lower Abdomen" or "Pelvis".
    // For now, let's map the "Lumbar" area to "Hip/Pelvis" in Front view or simply extend Abdomen?
    // Let's keep a "Lower Abdomen/Pelvis" area using the space of 'lombar' + 'quadril'.
    // Or just Map "quadril_direito" to cover that lower side area.
    // Let's use the space from Y=95 to Y=118 for Hips/Pelvis on front.
    path: "M42,95 L50,95 L50,118 L40,118 C38,114 40,110 42,95 Z",
    centerX: 45, centerY: 106
  },
  quadril_esquerdo: {
    path: "M50,95 L58,95 C60,100 62,114 60,118 L50,118 L50,95 Z",
    centerX: 55, centerY: 106
  },

  coxa_direita: {
    path: "M40,118 L50,118 L48,155 L38,155 Z",
    centerX: 44, centerY: 136
  },
  coxa_esquerda: {
    path: "M50,118 L60,118 L62,155 L52,155 Z",
    centerX: 56, centerY: 136
  },
  joelho_direito: {
    path: "M38,155 L48,155 L47,170 L37,170 C36,165 36,160 38,155 Z",
    centerX: 42, centerY: 162
  },
  joelho_esquerdo: {
    path: "M52,155 L62,155 C64,160 64,165 63,170 L53,170 Z",
    centerX: 58, centerY: 162
  },
  perna_direita: {
    path: "M37,170 L47,170 L45,205 L35,205 Z",
    centerX: 41, centerY: 188
  },
  perna_esquerda: {
    path: "M53,170 L63,170 L65,205 L55,205 Z",
    centerX: 59, centerY: 188
  },
  tornozelo_direito: {
    path: "M35,205 L45,205 L44,215 L34,215 Z",
    centerX: 39, centerY: 210
  },
  tornozelo_esquerdo: {
    path: "M55,205 L65,205 L66,215 L56,215 Z",
    centerX: 61, centerY: 210
  },
  pe_direito: {
    path: "M30,215 L44,215 L44,222 C44,226 40,228 35,228 L32,228 C28,228 26,224 28,220 Z",
    centerX: 36, centerY: 222
  },
  pe_esquerdo: {
    path: "M56,215 L70,215 L72,220 C74,224 72,228 68,228 L65,228 C60,228 56,226 56,222 Z",
    centerX: 64, centerY: 222
  },
};

// Realistic SVG paths for human body silhouette - BACK VIEW
// NOTE: For Back View, Patient Right is Screen Right (Anatomical Standard for Back View usually? 
// Actually, if I am looking at someone's back, their Right arm is on my Right.
// So 'Direito' regions should be X > 50.
const backPaths: Partial<Record<BodyRegion, { path: string; centerX: number; centerY: number }>> = {
  // Head Back (Nuca)
  cabeca_nuca_esquerda: { // Patient Left (Screen Left)
    path: "M50,5 L50,38 C42,38 36,32 36,22 C36,12 42,5 50,5 Z",
    centerX: 43, centerY: 20
  },
  cabeca_nuca_direita: { // Patient Right (Screen Right)
    path: "M50,5 C58,5 64,12 64,22 C64,32 58,38 50,38 L50,5 Z",
    centerX: 57, centerY: 20
  },

  // Neck Back
  pescoco_nuca_esquerdo: { // Screen Left
    path: "M50,38 L50,48 L44,48 C44,48 42,40 50,38 Z",
    centerX: 47, centerY: 44
  },
  pescoco_nuca_direito: { // Screen Right
    path: "M50,38 C58,40 56,48 56,48 L50,48 L50,38 Z",
    centerX: 53, centerY: 44
  },

  // Back uses inverted logic for Left/Right compared to Front
  ombro_esquerdo: { // Screen Left
    path: "M44,48 L44,52 C40,52 32,54 28,58 L26,54 C30,50 38,48 44,48 Z",
    centerX: 35, centerY: 52
  },
  ombro_direito: { // Screen Right
    path: "M56,48 L56,52 C60,52 68,54 72,58 L74,54 C70,50 62,48 56,48 Z",
    centerX: 65, centerY: 52
  },

  // Upper Back (Costas Superior / Escápula)
  costas_superior_esquerda: { // Screen Left
    path: "M44,48 L50,48 L50,85 L40,85 L35,65 L44,48 Z", // Simplified shape
    centerX: 45, centerY: 65
  },
  costas_superior_direita: { // Screen Right
    path: "M50,48 L56,48 L65,65 L60,85 L50,85 L50,48 Z",
    centerX: 55, centerY: 65
  },

  braco_esquerdo: { // Screen Left
    path: "M28,58 L26,54 L22,58 L20,80 L26,82 L30,62 Z",
    centerX: 24, centerY: 68
  },
  braco_direito: { // Screen Right
    path: "M72,58 L74,54 L78,58 L80,80 L74,82 L70,62 Z",
    centerX: 76, centerY: 68
  },

  antebraco_esquerdo: {
    path: "M20,80 L26,82 L24,105 L16,103 Z",
    centerX: 21, centerY: 92
  },
  antebraco_direito: {
    path: "M80,80 L74,82 L76,105 L84,103 Z",
    centerX: 79, centerY: 92
  },

  // Hands (Palms vs Back of hand - simple rect for now)
  mao_esquerda: {
    path: "M16,103 L24,105 L25,115 C25,118 22,120 18,120 C14,120 12,117 13,114 Z",
    centerX: 19, centerY: 112
  },
  mao_direita: {
    path: "M84,103 L76,105 L75,115 C75,118 78,120 82,120 C86,120 88,117 87,114 Z",
    centerX: 81, centerY: 112
  },

  // Lumbar
  lombar_esquerda: { // Screen Left
    path: "M40,85 L50,85 L50,105 L42,105 Z",
    centerX: 45, centerY: 95
  },
  lombar_direita: { // Screen Right
    path: "M50,85 L60,85 L58,105 L50,105 Z",
    centerX: 55, centerY: 95
  },

  // Glutes
  gluteo_esquerdo: { // Screen Left
    path: "M42,105 L50,105 L50,125 L38,125 C36,115 38,110 42,105 Z",
    centerX: 44, centerY: 115
  },
  gluteo_direito: { // Screen Right
    path: "M50,105 L58,105 C62,110 64,115 62,125 L50,125 L50,105 Z",
    centerX: 56, centerY: 115
  },

  coxa_esquerda: {
    path: "M38,125 L50,125 L48,160 L36,160 Z",
    centerX: 44, centerY: 142
  },
  coxa_direita: {
    path: "M50,125 L62,125 L64,160 L52,160 Z",
    centerX: 56, centerY: 142
  },

  // Popliteal/Knee Back
  joelho_esquerdo: {
    path: "M36,160 L48,160 L47,175 L35,175 Z",
    centerX: 42, centerY: 167
  },
  joelho_direito: {
    path: "M52,160 L64,160 L63,175 L51,175 Z",
    centerX: 58, centerY: 167
  },

  // Calves (Panturrilhas)
  panturrilha_esquerda: {
    path: "M35,175 L47,175 L45,210 L33,210 Z",
    centerX: 40, centerY: 192
  },
  panturrilha_direita: {
    path: "M53,175 L65,175 L67,210 L55,210 Z",
    centerX: 60, centerY: 192
  },

  tornozelo_esquerdo: {
    path: "M33,210 L45,210 L44,220 L32,220 Z",
    centerX: 38, centerY: 215
  },
  tornozelo_direito: {
    path: "M55,210 L67,210 L68,220 L56,220 Z",
    centerX: 62, centerY: 215
  },

  // Feet Back (Heels)
  pe_esquerdo: {
    path: "M32,220 L44,220 L44,228 L30,228 Z",
    centerX: 37, centerY: 224
  },
  pe_direito: {
    path: "M56,220 L68,220 L70,228 L56,228 Z",
    centerX: 63, centerY: 224
  },
};

export function PainMapCanvas({ painPoints, onPainPointsChange, readOnly = false, variant = '2d', evolutionData }: PainMapCanvasProps) {
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<BodyRegion | null>(null);
  const [view, setView] = useState<'front' | 'back'>('front');

  // Convert PainMapPoint to BodyMap PainPoint format
  const bodyMapPoints: PainPoint[] = painPoints.map(p => ({
    id: `point-${p.x}-${p.y}`,
    regionCode: p.region,
    region: p.region,
    intensity: p.intensity,
    painType: p.painType as PainPoint['painType'],
    notes: p.description,
    x: p.x,
    y: p.y,
  }));

  const handleBodyMapPointAdd = (point: Omit<PainPoint, 'id'>) => {
    // Convert back to PainMapPoint
    const newPoint: PainMapPoint = {
      region: point.regionCode as BodyRegion,
      intensity: point.intensity as PainIntensity,
      painType: point.painType as PainType,
      description: point.notes,
      x: point.x,
      y: point.y
    };
    onPainPointsChange([...painPoints, newPoint]);
  };

  const handleBodyMapPointRemove = (pointId: string) => {
    const point = bodyMapPoints.find(p => p.id === pointId);
    if (point) {
      onPainPointsChange(painPoints.filter(p => p.x !== point.x || p.y !== point.y));
    }
  };

  const handleBodyMapPointUpdate = (point: PainPoint) => {
    const newPoints = painPoints.map(p => {
      // Create a unique ID check or match by x/y coords which should be stable for a given point
      if (Math.abs(p.x - point.x) < 0.1 && Math.abs(p.y - point.y) < 0.1) {
        return {
          ...p,
          intensity: point.intensity as PainIntensity,
          painType: point.painType as PainType,
          description: point.notes
        };
      }
      return p;
    });
    onPainPointsChange(newPoints);
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return 'transparent';
    if (intensity <= 2) return '#22c55e';
    if (intensity <= 4) return '#84cc16';
    if (intensity <= 6) return '#eab308';
    if (intensity <= 8) return '#f97316';
    return '#ef4444';
  };

  if (variant === '3d') {
    return (
      <div className="w-full h-[800px] relative overflow-hidden rounded-xl border border-white/10 shadow-2xl bg-black">
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

  // Merge paths for lookup
  const allPaths = { ...frontPaths, ...backPaths };
  const currentPaths = view === 'front' ? frontPaths : backPaths;

  const handleRegionClick = (region: BodyRegion) => {
    if (readOnly) return;
    setSelectedRegion(region);
  };

  const handlePainUpdate = (intensity: PainIntensity, painType: PainType, description?: string) => {
    if (!selectedRegion) return;

    // Lookup in all paths because selectedRegion might be from the other view if we didn't clear it
    // (though usually we see it). 
    // Typescript might complain if we index with specific keys on partial record.
    const regionData = allPaths[selectedRegion];
    if (!regionData) return;

    const newPoint: PainMapPoint = {
      region: selectedRegion,
      intensity,
      painType,
      description,
      x: regionData.centerX,
      y: regionData.centerY
    };

    const updatedPoints = painPoints.filter(p => p.region !== selectedRegion);
    if (intensity > 0) {
      updatedPoints.push(newPoint);
    }

    onPainPointsChange(updatedPoints);
  };

  const handleRemovePoint = (region: BodyRegion) => {
    onPainPointsChange(painPoints.filter(p => p.region !== region));
    setSelectedRegion(null);
  };

  const selectedPoint = selectedRegion ? painPoints.find(p => p.region === selectedRegion) : null;


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Body Map Canvas */}
      <Card className="p-6 bg-gradient-to-b from-card to-card/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Label className="block text-lg font-semibold">Mapa de Dor Corporal</Label>
            <p className="text-xs text-muted-foreground">Clique nas regiões para registrar a dor</p>
          </div>
          {!readOnly && (
            <div className="flex bg-muted/50 p-1 rounded-lg">
              <button
                onClick={() => setView('front')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'front'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Frente
              </button>
              <button
                onClick={() => setView('back')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'back'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Costas
              </button>
            </div>
          )}
        </div>

        <div className="relative bg-gradient-to-b from-muted/30 to-muted/10 rounded-2xl p-4">
          <svg
            viewBox="0 0 100 240"
            className="w-full max-w-[280px] mx-auto drop-shadow-lg"
            style={{ minHeight: '420px' }}
          >
            <defs>
              {/* Body gradient */}
              <linearGradient id="bodyFill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.15" />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.08" />
              </linearGradient>

              {/* Hover gradient */}
              <linearGradient id="hoverFill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
              </linearGradient>

              {/* Selected glow */}
              <filter id="selectedGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor="hsl(var(--primary))" floodOpacity="0.6" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Pain intensity gradients */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                <radialGradient key={i} id={`painGradient${i}`} cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor={getIntensityColor(i)} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={getIntensityColor(i)} stopOpacity="0.5" />
                </radialGradient>
              ))}

              {/* Shadow filter */}
              <filter id="bodyShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
              </filter>
            </defs>

            {/* Body outline for context */}
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
                    strokeWidth="0.3"
                    opacity="0.3"
                  />
                );
              })}
            </g>

            {/* Render interactive body regions */}
            {(Object.keys(currentPaths) as BodyRegion[]).map((region) => {
              const data = currentPaths[region];
              if (!data) return null;
              const { path, centerX, centerY } = data;

              const painPoint = painPoints.find(p => p.region === region);
              const isSelected = selectedRegion === region;
              const isHovered = hoveredRegion === region;

              let fillColor = 'url(#bodyFill)';
              if (painPoint && painPoint.intensity > 0) {
                fillColor = `url(#painGradient${painPoint.intensity})`;
              } else if (isHovered && !readOnly) {
                fillColor = 'url(#hoverFill)';
              }

              return (
                <g key={region}>
                  <path
                    d={path}
                    fill={fillColor}
                    stroke={isSelected ? 'hsl(var(--primary))' : isHovered ? 'hsl(var(--primary)/0.5)' : 'hsl(var(--border))'}
                    strokeWidth={isSelected ? 1.5 : 0.5}
                    className={readOnly ? '' : 'cursor-pointer transition-all duration-300'}
                    onClick={() => handleRegionClick(region)}
                    onMouseEnter={() => !readOnly && setHoveredRegion(region)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    filter={isSelected ? 'url(#selectedGlow)' : undefined}
                  />

                  {/* Pain intensity badge points */}
                  {painPoint && painPoint.intensity > 0 && (
                    <g className="pointer-events-none animate-scale-in">
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r={6}
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
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
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

        {/* Legend */}
        <div className="mt-6 p-3 bg-muted/30 rounded-xl">
          <p className="text-xs font-medium text-muted-foreground mb-3">Escala de Intensidade</p>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: '#22c55e' }} />
              <span className="text-[10px] text-muted-foreground">1-2</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: '#84cc16' }} />
              <span className="text-[10px] text-muted-foreground">3-4</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: '#eab308' }} />
              <span className="text-[10px] text-muted-foreground">5-6</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: '#f97316' }} />
              <span className="text-[10px] text-muted-foreground">7-8</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-[10px] text-muted-foreground">9-10</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Pain Details Panel */}
      <Card className="p-6">
        <Label className="mb-4 block text-lg font-semibold">Detalhes da Dor</Label>

        {selectedRegion ? (
          <div className="space-y-5 animate-fade-in">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Badge variant="secondary" className="text-sm font-medium">
                {PainMapService.getRegionLabel(selectedRegion)}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intensity" className="text-sm">Intensidade da Dor</Label>
              <Select
                value={selectedPoint?.intensity?.toString() || '0'}
                onValueChange={(v) => handlePainUpdate(
                  parseInt(v) as PainIntensity,
                  selectedPoint?.painType || 'aguda',
                  selectedPoint?.description
                )}
                disabled={readOnly}
              >
                <SelectTrigger id="intensity" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <SelectItem key={n} value={n.toString()}>
                      <div className="flex items-center gap-2">
                        {n > 0 && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getIntensityColor(n) }}
                          />
                        )}
                        <span>{n} - {n === 0 ? 'Sem dor' : n <= 2 ? 'Mínima' : n <= 4 ? 'Leve' : n <= 6 ? 'Moderada' : n <= 8 ? 'Intensa' : 'Severa'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="painType" className="text-sm">Tipo de Dor</Label>
              <Select
                value={selectedPoint?.painType || 'aguda'}
                onValueChange={(v) => handlePainUpdate(
                  selectedPoint?.intensity || 0,
                  v as PainType,
                  selectedPoint?.description
                )}
                disabled={readOnly}
              >
                <SelectTrigger id="painType" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aguda">🔥 Aguda</SelectItem>
                  <SelectItem value="cronica">⏳ Crônica</SelectItem>
                  <SelectItem value="latejante">💓 Latejante</SelectItem>
                  <SelectItem value="queimacao">🌡️ Queimação</SelectItem>
                  <SelectItem value="formigamento">⚡ Formigamento</SelectItem>
                  <SelectItem value="dormencia">😶 Dormência</SelectItem>
                  <SelectItem value="peso">🏋️ Peso</SelectItem>
                  <SelectItem value="pontada">📌 Pontada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm">Observações</Label>
              <Textarea
                id="description"
                value={selectedPoint?.description || ''}
                onChange={(e) => handlePainUpdate(
                  selectedPoint?.intensity || 0,
                  selectedPoint?.painType || 'aguda',
                  e.target.value
                )}
                placeholder="Descreva quando a dor piora, melhora, ou outras características..."
                rows={3}
                disabled={readOnly}
                className="resize-none"
              />
            </div>

            {selectedPoint && !readOnly && (
              <button
                onClick={() => handleRemovePoint(selectedRegion)}
                className="text-destructive text-sm hover:underline flex items-center gap-1"
              >
                ✕ Remover dor desta região
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <span className="text-2xl">👆</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Clique em uma região do corpo<br />para registrar a dor
            </p>
          </div>
        )}

        {/* Summary */}
        {painPoints.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <Label className="mb-3 block font-semibold">Resumo da Avaliação</Label>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Regiões afetadas</span>
                <Badge variant="secondary">{painPoints.length}</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Intensidade média</span>
                <Badge
                  variant="secondary"
                  style={{
                    backgroundColor: getIntensityColor(Math.round(painPoints.reduce((a, p) => a + p.intensity, 0) / painPoints.length)),
                    color: 'white'
                  }}
                >
                  {(painPoints.reduce((a, p) => a + p.intensity, 0) / painPoints.length).toFixed(1)}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Região mais afetada</span>
                <Badge variant="outline" className="text-xs">
                  {PainMapService.getRegionLabel(
                    [...painPoints].sort((a, b) => b.intensity - a.intensity)[0].region
                  )}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
