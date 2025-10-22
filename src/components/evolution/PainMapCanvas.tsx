import { useState, useRef } from 'react';
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

export function PainMapCanvas({ painPoints, onPainPointsChange, readOnly = false }: PainMapCanvasProps) {
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const bodyRegions: { region: BodyRegion; x: number; y: number; width: number; height: number }[] = [
    { region: 'cabeca', x: 45, y: 5, width: 10, height: 8 },
    { region: 'pescoco', x: 47, y: 13, width: 6, height: 5 },
    { region: 'ombro_direito', x: 35, y: 18, width: 12, height: 8 },
    { region: 'ombro_esquerdo', x: 53, y: 18, width: 12, height: 8 },
    { region: 'braco_direito', x: 32, y: 26, width: 8, height: 15 },
    { region: 'braco_esquerdo', x: 60, y: 26, width: 8, height: 15 },
    { region: 'antebraco_direito', x: 30, y: 41, width: 8, height: 15 },
    { region: 'antebraco_esquerdo', x: 62, y: 41, width: 8, height: 15 },
    { region: 'mao_direita', x: 28, y: 56, width: 8, height: 8 },
    { region: 'mao_esquerda', x: 64, y: 56, width: 8, height: 8 },
    { region: 'torax', x: 42, y: 18, width: 16, height: 15 },
    { region: 'abdomen', x: 42, y: 33, width: 16, height: 12 },
    { region: 'lombar', x: 42, y: 45, width: 16, height: 10 },
    { region: 'quadril_direito', x: 40, y: 55, width: 10, height: 8 },
    { region: 'quadril_esquerdo', x: 50, y: 55, width: 10, height: 8 },
    { region: 'coxa_direita', x: 40, y: 63, width: 8, height: 18 },
    { region: 'coxa_esquerda', x: 52, y: 63, width: 8, height: 18 },
    { region: 'joelho_direito', x: 40, y: 81, width: 8, height: 6 },
    { region: 'joelho_esquerdo', x: 52, y: 81, width: 8, height: 6 },
    { region: 'perna_direita', x: 40, y: 87, width: 7, height: 18 },
    { region: 'perna_esquerda', x: 53, y: 87, width: 7, height: 18 },
    { region: 'tornozelo_direito', x: 40, y: 105, width: 7, height: 5 },
    { region: 'tornozelo_esquerdo', x: 53, y: 105, width: 7, height: 5 },
    { region: 'pe_direito', x: 38, y: 110, width: 9, height: 8 },
    { region: 'pe_esquerdo', x: 53, y: 110, width: 9, height: 8 },
  ];

  const handleRegionClick = (region: BodyRegion) => {
    if (readOnly) return;
    setSelectedRegion(region);
  };

  const handlePainUpdate = (intensity: PainIntensity, painType: PainType, description?: string) => {
    if (!selectedRegion) return;

    const regionData = bodyRegions.find(r => r.region === selectedRegion)!;
    const newPoint: PainMapPoint = {
      region: selectedRegion,
      intensity,
      painType,
      description,
      x: regionData.x + regionData.width / 2,
      y: regionData.y + regionData.height / 2
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
          ref={svgRef}
          viewBox="0 0 100 120"
          className="w-full max-w-md mx-auto border rounded-lg bg-background"
          style={{ minHeight: '400px' }}
        >
          {/* Body outline */}
          {bodyRegions.map(({ region, x, y, width, height }) => {
            const painPoint = painPoints.find(p => p.region === region);
            const fillColor = painPoint 
              ? PainMapService.getPainIntensityColor(painPoint.intensity)
              : 'transparent';
            
            return (
              <rect
                key={region}
                x={x}
                y={y}
                width={width}
                height={height}
                fill={fillColor}
                stroke={selectedRegion === region ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                strokeWidth={selectedRegion === region ? 2 : 1}
                className={readOnly ? '' : 'cursor-pointer hover:opacity-80 transition-opacity'}
                onClick={() => handleRegionClick(region)}
                opacity={painPoint ? 0.7 : 0.3}
              />
            );
          })}

          {/* Pain points markers */}
          {painPoints.map((point, idx) => (
            <g key={idx}>
              <circle
                cx={point.x}
                cy={point.y}
                r={2}
                fill="hsl(var(--destructive))"
                stroke="white"
                strokeWidth={0.5}
              />
              <text
                x={point.x + 3}
                y={point.y + 1}
                fontSize="4"
                fill="hsl(var(--foreground))"
                fontWeight="bold"
              >
                {point.intensity}
              </text>
            </g>
          ))}
        </svg>
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
