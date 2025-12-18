import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowDown, ArrowUp, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { PainMapRecord, PainMapPoint, BodyRegion } from '@/types/painMap';
import { comparePainMaps } from '@/hooks/usePainMapHistory';
import { PainMapService } from '@/lib/services/painMapService';

interface PainMapComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  painMaps: PainMapRecord[];
}

// Mini body SVG paths for comparison view
const bodyPaths: Record<BodyRegion, { path: string; centerX: number; centerY: number }> = {
  cabeca: { path: "M50,5 C58,5 64,12 64,22 C64,32 58,38 50,38 C42,38 36,32 36,22 C36,12 42,5 50,5 Z", centerX: 50, centerY: 20 },
  pescoco: { path: "M45,38 C45,38 47,40 50,40 C53,40 55,38 55,38 L56,48 L44,48 Z", centerX: 50, centerY: 44 },
  ombro_direito: { path: "M44,48 L44,52 C40,52 32,54 28,58 L26,54 C30,50 38,48 44,48 Z", centerX: 35, centerY: 52 },
  ombro_esquerdo: { path: "M56,48 L56,52 C60,52 68,54 72,58 L74,54 C70,50 62,48 56,48 Z", centerX: 65, centerY: 52 },
  torax: { path: "M44,48 L56,48 L58,52 L60,75 L40,75 L42,52 Z", centerX: 50, centerY: 62 },
  braco_direito: { path: "M28,58 L26,54 L22,58 L20,80 L26,82 L30,62 Z", centerX: 24, centerY: 68 },
  braco_esquerdo: { path: "M72,58 L74,54 L78,58 L80,80 L74,82 L70,62 Z", centerX: 76, centerY: 68 },
  antebraco_direito: { path: "M20,80 L26,82 L24,105 L16,103 Z", centerX: 21, centerY: 92 },
  antebraco_esquerdo: { path: "M80,80 L74,82 L76,105 L84,103 Z", centerX: 79, centerY: 92 },
  mao_direita: { path: "M16,103 L24,105 L25,115 C25,118 22,120 18,120 C14,120 12,117 13,114 Z", centerX: 19, centerY: 112 },
  mao_esquerda: { path: "M84,103 L76,105 L75,115 C75,118 78,120 82,120 C86,120 88,117 87,114 Z", centerX: 81, centerY: 112 },
  abdomen: { path: "M40,75 L60,75 L58,95 L42,95 Z", centerX: 50, centerY: 85 },
  lombar: { path: "M42,95 L58,95 L56,108 L44,108 Z", centerX: 50, centerY: 102 },
  quadril_direito: { path: "M44,108 L50,108 L50,118 L40,118 C38,114 40,110 44,108 Z", centerX: 45, centerY: 113 },
  quadril_esquerdo: { path: "M50,108 L56,108 C60,110 62,114 60,118 L50,118 Z", centerX: 55, centerY: 113 },
  coxa_direita: { path: "M40,118 L50,118 L48,155 L38,155 Z", centerX: 44, centerY: 136 },
  coxa_esquerda: { path: "M50,118 L60,118 L62,155 L52,155 Z", centerX: 56, centerY: 136 },
  joelho_direito: { path: "M38,155 L48,155 L47,170 L37,170 C36,165 36,160 38,155 Z", centerX: 42, centerY: 162 },
  joelho_esquerdo: { path: "M52,155 L62,155 C64,160 64,165 63,170 L53,170 Z", centerX: 58, centerY: 162 },
  perna_direita: { path: "M37,170 L47,170 L45,205 L35,205 Z", centerX: 41, centerY: 188 },
  perna_esquerda: { path: "M53,170 L63,170 L65,205 L55,205 Z", centerX: 59, centerY: 188 },
  tornozelo_direito: { path: "M35,205 L45,205 L44,215 L34,215 Z", centerX: 39, centerY: 210 },
  tornozelo_esquerdo: { path: "M55,205 L65,205 L66,215 L56,215 Z", centerX: 61, centerY: 210 },
  pe_direito: { path: "M30,215 L44,215 L44,222 C44,226 40,228 35,228 L32,228 C28,228 26,224 28,220 Z", centerX: 36, centerY: 222 },
  pe_esquerdo: { path: "M56,215 L70,215 L72,220 C74,224 72,228 68,228 L65,228 C60,228 56,226 56,222 Z", centerX: 64, centerY: 222 },
};

function MiniBodyMap({ painPoints, label }: { painPoints: PainMapPoint[]; label: string }) {
  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return 'transparent';
    if (intensity <= 2) return '#22c55e';
    if (intensity <= 4) return '#84cc16';
    if (intensity <= 6) return '#eab308';
    if (intensity <= 8) return '#f97316';
    return '#ef4444';
  };

  const pointsMap = new Map<BodyRegion, number>();
  painPoints.forEach(p => pointsMap.set(p.region, p.intensity));

  return (
    <div className="text-center">
      <p className="text-sm font-medium mb-2">{label}</p>
      <svg viewBox="0 0 100 240" className="w-full max-w-[120px] mx-auto">
        {(Object.keys(bodyPaths) as BodyRegion[]).map((region) => {
          const { path, centerX, centerY } = bodyPaths[region];
          const intensity = pointsMap.get(region) || 0;
          
          return (
            <g key={region}>
              <path
                d={path}
                fill={intensity > 0 ? getIntensityColor(intensity) : 'hsl(var(--muted))'}
                stroke="hsl(var(--border))"
                strokeWidth="0.3"
                opacity={intensity > 0 ? 0.8 : 0.3}
              />
              {intensity > 0 && (
                <text
                  x={centerX}
                  y={centerY + 2}
                  fontSize="6"
                  fill="white"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {intensity}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function PainMapComparisonModal({ open, onOpenChange, painMaps }: PainMapComparisonModalProps) {
  const [session1Id, setSession1Id] = useState<string | null>(null);
  const [session2Id, setSession2Id] = useState<string | null>(null);

  const session1 = painMaps.find(pm => pm.id === session1Id);
  const session2 = painMaps.find(pm => pm.id === session2Id);

  const comparison = useMemo(() => {
    if (!session1 || !session2) return null;
    return comparePainMaps(session1, session2);
  }, [session1, session2]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Comparar Mapas de Dor</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Sessão Anterior</Label>
            <Select value={session1Id || ''} onValueChange={setSession1Id}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma sessão" />
              </SelectTrigger>
              <SelectContent>
                {painMaps.map(pm => (
                  <SelectItem key={pm.id} value={pm.id} disabled={pm.id === session2Id}>
                    {new Date(pm.recorded_at).toLocaleDateString('pt-BR')} - Dor: {pm.global_pain_level}/10
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sessão Atual</Label>
            <Select value={session2Id || ''} onValueChange={setSession2Id}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma sessão" />
              </SelectTrigger>
              <SelectContent>
                {painMaps.map(pm => (
                  <SelectItem key={pm.id} value={pm.id} disabled={pm.id === session1Id}>
                    {new Date(pm.recorded_at).toLocaleDateString('pt-BR')} - Dor: {pm.global_pain_level}/10
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {session1 && session2 && comparison && (
          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {/* Overall change card */}
              <Card className={`p-4 ${
                comparison.overallChange > 10 ? 'bg-green-500/10 border-green-500/30' :
                comparison.overallChange < -10 ? 'bg-red-500/10 border-red-500/30' :
                'bg-yellow-500/10 border-yellow-500/30'
              }`}>
                <div className="flex items-center justify-center gap-3">
                  {comparison.overallChange > 10 ? (
                    <TrendingDown className="w-6 h-6 text-green-500" />
                  ) : comparison.overallChange < -10 ? (
                    <TrendingUp className="w-6 h-6 text-red-500" />
                  ) : (
                    <Minus className="w-6 h-6 text-yellow-500" />
                  )}
                  <span className="text-lg font-semibold">
                    {comparison.overallChange > 0 ? `Melhora de ${Math.round(comparison.overallChange)}%` :
                     comparison.overallChange < 0 ? `Piora de ${Math.round(Math.abs(comparison.overallChange))}%` :
                     'Sem alteração significativa'}
                  </span>
                </div>
              </Card>

              {/* Side by side body maps */}
              <div className="grid grid-cols-2 gap-6">
                <Card className="p-4">
                  <MiniBodyMap
                    painPoints={session1.pain_points as PainMapPoint[]}
                    label={new Date(session1.recorded_at).toLocaleDateString('pt-BR')}
                  />
                  <div className="text-center mt-2">
                    <Badge variant={session1.global_pain_level <= 3 ? 'secondary' : session1.global_pain_level <= 6 ? 'default' : 'destructive'}>
                      Dor Global: {session1.global_pain_level}/10
                    </Badge>
                  </div>
                </Card>
                <Card className="p-4">
                  <MiniBodyMap
                    painPoints={session2.pain_points as PainMapPoint[]}
                    label={new Date(session2.recorded_at).toLocaleDateString('pt-BR')}
                  />
                  <div className="text-center mt-2">
                    <Badge variant={session2.global_pain_level <= 3 ? 'secondary' : session2.global_pain_level <= 6 ? 'default' : 'destructive'}>
                      Dor Global: {session2.global_pain_level}/10
                    </Badge>
                  </div>
                </Card>
              </div>

              {/* Region comparison table */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3">Comparação por Região</h4>
                <div className="space-y-2">
                  {comparison.comparisons.map((comp) => (
                    <div
                      key={comp.region}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        comp.status === 'improved' ? 'bg-green-500/10' :
                        comp.status === 'worsened' ? 'bg-red-500/10' :
                        'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {comp.status === 'improved' ? (
                          <ArrowDown className="w-4 h-4 text-green-500" />
                        ) : comp.status === 'worsened' ? (
                          <ArrowUp className="w-4 h-4 text-red-500" />
                        ) : (
                          <Minus className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="font-medium">{comp.label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {comp.session1Intensity}/10 → {comp.session2Intensity}/10
                        </span>
                        <Badge variant={
                          comp.status === 'improved' ? 'secondary' :
                          comp.status === 'worsened' ? 'destructive' :
                          'outline'
                        }>
                          {comp.difference > 0 ? '+' : ''}{comp.difference}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </ScrollArea>
        )}

        {(!session1 || !session2) && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Selecione duas sessões para comparar
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
