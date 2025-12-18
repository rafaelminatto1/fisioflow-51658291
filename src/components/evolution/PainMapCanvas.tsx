import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { PainMapPoint, PainIntensity, PainType, BodyRegion } from '@/types/painMap';
import { PainMapService } from '@/lib/services/painMapService';

interface PainMapCanvasProps {
  painPoints: PainMapPoint[];
  onPainPointsChange: (points: PainMapPoint[]) => void;
  readOnly?: boolean;
}

// SVG paths for anatomical body regions
const bodyPaths: Record<BodyRegion, { path: string; centerX: number; centerY: number }> = {
  cabeca: {
    path: "M50,8 C56,8 60,12 60,20 C60,28 56,32 50,32 C44,32 40,28 40,20 C40,12 44,8 50,8",
    centerX: 50, centerY: 20
  },
  pescoco: {
    path: "M46,32 L54,32 L54,40 L46,40 Z",
    centerX: 50, centerY: 36
  },
  ombro_direito: {
    path: "M30,42 C34,38 40,40 46,42 L46,50 C40,48 34,48 30,50 Z",
    centerX: 38, centerY: 45
  },
  ombro_esquerdo: {
    path: "M54,42 C60,40 66,38 70,42 L70,50 C66,48 60,48 54,50 Z",
    centerX: 62, centerY: 45
  },
  braco_direito: {
    path: "M26,50 L32,50 L34,72 L28,72 Z",
    centerX: 30, centerY: 61
  },
  braco_esquerdo: {
    path: "M68,50 L74,50 L72,72 L66,72 Z",
    centerX: 70, centerY: 61
  },
  antebraco_direito: {
    path: "M28,72 L34,72 L36,92 L26,92 Z",
    centerX: 31, centerY: 82
  },
  antebraco_esquerdo: {
    path: "M66,72 L72,72 L74,92 L64,92 Z",
    centerX: 69, centerY: 82
  },
  mao_direita: {
    path: "M24,92 L38,92 L38,102 C38,104 36,106 32,106 L30,106 C26,106 24,104 24,102 Z",
    centerX: 31, centerY: 98
  },
  mao_esquerda: {
    path: "M62,92 L76,92 L76,102 C76,104 74,106 70,106 L68,106 C64,106 62,104 62,102 Z",
    centerX: 69, centerY: 98
  },
  torax: {
    path: "M40,42 L60,42 L62,50 L62,65 L58,68 L42,68 L38,65 L38,50 Z",
    centerX: 50, centerY: 55
  },
  abdomen: {
    path: "M42,68 L58,68 L60,85 L40,85 Z",
    centerX: 50, centerY: 76
  },
  lombar: {
    path: "M40,85 L60,85 L58,95 L42,95 Z",
    centerX: 50, centerY: 90
  },
  quadril_direito: {
    path: "M42,95 L50,95 L50,105 L38,105 C38,100 40,97 42,95",
    centerX: 44, centerY: 100
  },
  quadril_esquerdo: {
    path: "M50,95 L58,95 C60,97 62,100 62,105 L50,105 Z",
    centerX: 56, centerY: 100
  },
  coxa_direita: {
    path: "M38,105 L50,105 L48,140 L36,140 Z",
    centerX: 43, centerY: 122
  },
  coxa_esquerda: {
    path: "M50,105 L62,105 L64,140 L52,140 Z",
    centerX: 57, centerY: 122
  },
  joelho_direito: {
    path: "M36,140 L48,140 L47,152 L35,152 Z",
    centerX: 42, centerY: 146
  },
  joelho_esquerdo: {
    path: "M52,140 L64,140 L65,152 L53,152 Z",
    centerX: 58, centerY: 146
  },
  perna_direita: {
    path: "M35,152 L47,152 L46,180 L34,180 Z",
    centerX: 40, centerY: 166
  },
  perna_esquerda: {
    path: "M53,152 L65,152 L66,180 L54,180 Z",
    centerX: 60, centerY: 166
  },
  tornozelo_direito: {
    path: "M34,180 L46,180 L45,188 L33,188 Z",
    centerX: 39, centerY: 184
  },
  tornozelo_esquerdo: {
    path: "M54,180 L66,180 L67,188 L55,188 Z",
    centerX: 61, centerY: 184
  },
  pe_direito: {
    path: "M30,188 L48,188 L48,196 C48,198 46,200 42,200 L36,200 C32,200 30,198 30,196 Z",
    centerX: 39, centerY: 194
  },
  pe_esquerdo: {
    path: "M52,188 L70,188 L70,196 C70,198 68,200 64,200 L58,200 C54,200 52,198 52,196 Z",
    centerX: 61, centerY: 194
  },
};

export function PainMapCanvas({ painPoints, onPainPointsChange, readOnly = false }: PainMapCanvasProps) {
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);

  const handleRegionClick = (region: BodyRegion) => {
    if (readOnly) return;
    setSelectedRegion(region);
  };

  const handlePainUpdate = (intensity: PainIntensity, painType: PainType, description?: string) => {
    if (!selectedRegion) return;

    const regionData = bodyPaths[selectedRegion];
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
  };

  const selectedPoint = selectedRegion ? painPoints.find(p => p.region === selectedRegion) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Body Map Canvas */}
      <Card className="p-6">
        <Label className="mb-4 block">Mapa de Dor (Clique nas regiões)</Label>
        <svg
          viewBox="0 0 100 210"
          className="w-full max-w-xs mx-auto"
          style={{ minHeight: '450px' }}
        >
          {/* Body silhouette background */}
          <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.1" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Render body regions */}
          {(Object.keys(bodyPaths) as BodyRegion[]).map((region) => {
            const { path, centerX, centerY } = bodyPaths[region];
            const painPoint = painPoints.find(p => p.region === region);
            const isSelected = selectedRegion === region;
            const fillColor = painPoint 
              ? PainMapService.getPainIntensityColor(painPoint.intensity)
              : 'url(#bodyGradient)';
            
            return (
              <g key={region}>
                <path
                  d={path}
                  fill={fillColor}
                  stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={isSelected ? 2 : 0.5}
                  className={readOnly ? '' : 'cursor-pointer transition-all duration-200 hover:opacity-80'}
                  onClick={() => handleRegionClick(region)}
                  opacity={painPoint ? 0.85 : 0.6}
                  filter={isSelected ? 'url(#glow)' : undefined}
                />
                {/* Pain intensity indicator */}
                {painPoint && painPoint.intensity > 0 && (
                  <g>
                    <circle
                      cx={centerX}
                      cy={centerY}
                      r={4}
                      fill="hsl(var(--destructive))"
                      stroke="white"
                      strokeWidth={1}
                      className="pointer-events-none"
                    />
                    <text
                      x={centerX}
                      y={centerY + 1.5}
                      fontSize="5"
                      fill="white"
                      textAnchor="middle"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {painPoint.intensity}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} />
            <span className="text-muted-foreground">Leve (1-3)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#eab308' }} />
            <span className="text-muted-foreground">Moderada (4-6)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }} />
            <span className="text-muted-foreground">Alta (7-8)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-muted-foreground">Intensa (9-10)</span>
          </div>
        </div>
      </Card>

      {/* Pain Details Panel */}
      <Card className="p-6">
        <Label className="mb-4 block">Detalhes da Dor</Label>
        
        {selectedRegion ? (
          <div className="space-y-4">
            <div>
              <Badge variant="outline" className="mb-2">
                {PainMapService.getRegionLabel(selectedRegion)}
              </Badge>
            </div>

            <div>
              <Label htmlFor="intensity">Intensidade (0-10)</Label>
              <Select
                value={selectedPoint?.intensity?.toString() || '0'}
                onValueChange={(v) => handlePainUpdate(
                  parseInt(v) as PainIntensity,
                  selectedPoint?.painType || 'aguda',
                  selectedPoint?.description
                )}
                disabled={readOnly}
              >
                <SelectTrigger id="intensity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} - {n === 0 ? 'Sem dor' : n <= 3 ? 'Leve' : n <= 6 ? 'Moderada' : 'Intensa'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="painType">Tipo de Dor</Label>
              <Select
                value={selectedPoint?.painType || 'aguda'}
                onValueChange={(v) => handlePainUpdate(
                  selectedPoint?.intensity || 0,
                  v as PainType,
                  selectedPoint?.description
                )}
                disabled={readOnly}
              >
                <SelectTrigger id="painType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aguda">Aguda</SelectItem>
                  <SelectItem value="cronica">Crônica</SelectItem>
                  <SelectItem value="latejante">Latejante</SelectItem>
                  <SelectItem value="queimacao">Queimação</SelectItem>
                  <SelectItem value="formigamento">Formigamento</SelectItem>
                  <SelectItem value="dormencia">Dormência</SelectItem>
                  <SelectItem value="peso">Peso</SelectItem>
                  <SelectItem value="pontada">Pontada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={selectedPoint?.description || ''}
                onChange={(e) => handlePainUpdate(
                  selectedPoint?.intensity || 0,
                  selectedPoint?.painType || 'aguda',
                  e.target.value
                )}
                placeholder="Ex: Dor piora ao subir escadas..."
                rows={3}
                disabled={readOnly}
              />
            </div>

            {selectedPoint && !readOnly && (
              <button
                onClick={() => handleRemovePoint(selectedRegion)}
                className="text-destructive text-sm hover:underline"
              >
                Remover dor desta região
              </button>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Clique em uma região do corpo para registrar a dor
          </p>
        )}

        {/* Summary */}
        {painPoints.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <Label className="mb-2 block">Resumo</Label>
            <div className="space-y-2 text-sm">
              <p><strong>Total de regiões com dor:</strong> {painPoints.length}</p>
              <p><strong>Dor média:</strong> {(painPoints.reduce((a, p) => a + p.intensity, 0) / painPoints.length).toFixed(1)}</p>
              <p><strong>Região mais afetada:</strong> {PainMapService.getRegionLabel(
                painPoints.sort((a, b) => b.intensity - a.intensity)[0].region
              )}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
