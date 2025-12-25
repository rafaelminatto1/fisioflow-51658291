import { useState } from 'react';
import { BodyMap, PainPoint } from './BodyMap';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus, Calendar, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PainMap {
  id: string;
  view: 'front' | 'back';
  points: PainPoint[];
  createdAt: string;
  sessionNumber?: number;
}

interface PainMapComparisonProps {
  patientName: string;
  maps: PainMap[];
  onSelectMaps?: (map1Id: string, map2Id: string) => void;
}

export function PainMapComparison({
  patientName,
  maps,
  onSelectMaps,
}: PainMapComparisonProps) {
  const [selectedMap1, setSelectedMap1] = useState<string>(maps[0]?.id || '');
  const [selectedMap2, setSelectedMap2] = useState<string>(maps[maps.length - 1]?.id || '');
  const [comparisonView, setComparisonView] = useState<'front' | 'back'>('front');

  const map1 = maps.find(m => m.id === selectedMap1);
  const map2 = maps.find(m => m.id === selectedMap2);

  // Filtrar mapas pela view selecionada
  const map1Points = map1?.view === comparisonView ? map1.points : [];
  const map2Points = map2?.view === comparisonView ? map2.points : [];

  // Calcular evolução
  const evolution = calculateEvolution(map1Points, map2Points);

  const handleSelectMap1 = (id: string) => {
    setSelectedMap1(id);
    onSelectMaps?.(id, selectedMap2);
  };

  const handleSelectMap2 = (id: string) => {
    setSelectedMap2(id);
    onSelectMaps?.(selectedMap1, id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Comparação de Mapas de Dor</h2>
          <p className="text-muted-foreground">{patientName}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Vista:</span>
          <Select value={comparisonView} onValueChange={(v) => setComparisonView(v as 'front' | 'back')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="front">Frente</SelectItem>
              <SelectItem value="back">Costas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Seletores de mapas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Mapa Anterior</label>
          <Select value={selectedMap1} onValueChange={handleSelectMap1}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um mapa" />
            </SelectTrigger>
            <SelectContent>
              {maps.map(map => (
                <SelectItem key={map.id} value={map.id}>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(map.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    {map.sessionNumber && (
                      <Badge variant="outline" className="ml-2">
                        Sessão {map.sessionNumber}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Mapa Atual</label>
          <Select value={selectedMap2} onValueChange={handleSelectMap2}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um mapa" />
            </SelectTrigger>
            <SelectContent>
              {maps.map(map => (
                <SelectItem key={map.id} value={map.id}>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(map.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    {map.sessionNumber && (
                      <Badge variant="outline" className="ml-2">
                        Sessão {map.sessionNumber}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resumo da evolução */}
      <Card className={evolution.improvementPercentage > 0 ? 'border-green-500/50' : evolution.improvementPercentage < 0 ? 'border-red-500/50' : ''}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Resumo da Evolução
            </CardTitle>
            <div className="flex items-center gap-2">
              {evolution.improvementPercentage > 0 ? (
                <Badge className="bg-green-500">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  {evolution.improvementPercentage}% melhora
                </Badge>
              ) : evolution.improvementPercentage < 0 ? (
                <Badge variant="destructive">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {Math.abs(evolution.improvementPercentage)}% piora
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Minus className="w-4 h-4 mr-1" />
                  Sem alteração
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Regiões melhoradas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <TrendingDown className="w-4 h-4" />
                <span className="font-medium">Regiões Melhoradas</span>
              </div>
              {evolution.regionsImproved.length > 0 ? (
                <ul className="text-sm space-y-1">
                  {evolution.regionsImproved.map((region, i) => (
                    <li key={i} className="text-muted-foreground">• {region}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma</p>
              )}
            </div>

            {/* Regiões pioradas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">Regiões com Piora</span>
              </div>
              {evolution.regionsWorsened.length > 0 ? (
                <ul className="text-sm space-y-1">
                  {evolution.regionsWorsened.map((region, i) => (
                    <li key={i} className="text-muted-foreground">• {region}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma</p>
              )}
            </div>

            {/* Estatísticas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="font-medium">Estatísticas</span>
              </div>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>Pontos antes: {evolution.totalPointsBefore}</p>
                <p>Pontos depois: {evolution.totalPointsAfter}</p>
                <p>Intensidade média antes: {evolution.avgIntensityBefore.toFixed(1)}</p>
                <p>Intensidade média depois: {evolution.avgIntensityAfter.toFixed(1)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mapas lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mapa anterior */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {map1 && format(new Date(map1.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
            <CardDescription>
              {map1Points.length} pontos de dor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-[3/4] max-h-[400px] border rounded-lg bg-muted/20">
              <BodyMap
                view={comparisonView}
                points={map1Points}
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        {/* Mapa atual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {map2 && format(new Date(map2.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
            <CardDescription>
              {map2Points.length} pontos de dor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-[3/4] max-h-[400px] border rounded-lg bg-muted/20">
              <BodyMap
                view={comparisonView}
                points={map2Points}
                readOnly
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Função para calcular evolução
function calculateEvolution(pointsBefore: PainPoint[], pointsAfter: PainPoint[]) {
  // Mapear intensidades por região
  const beforeByRegion: Record<string, number> = {};
  const afterByRegion: Record<string, number> = {};

  pointsBefore.forEach(p => {
    beforeByRegion[p.regionCode] = p.intensity;
  });

  pointsAfter.forEach(p => {
    afterByRegion[p.regionCode] = p.intensity;
  });

  // Todas as regiões
  const allRegions = [...new Set([...Object.keys(beforeByRegion), ...Object.keys(afterByRegion)])];

  const regionsImproved: string[] = [];
  const regionsWorsened: string[] = [];

  let totalBefore = 0;
  let totalAfter = 0;

  allRegions.forEach(region => {
    const before = beforeByRegion[region] || 0;
    const after = afterByRegion[region] || 0;
    
    totalBefore += before;
    totalAfter += after;

    // Encontrar nome da região
    const regionName = pointsBefore.find(p => p.regionCode === region)?.region ||
                       pointsAfter.find(p => p.regionCode === region)?.region ||
                       region;

    if (after < before) {
      regionsImproved.push(regionName);
    } else if (after > before) {
      regionsWorsened.push(regionName);
    }
  });

  // Calcular % de melhora
  const improvementPercentage = totalBefore > 0 
    ? Math.round(((totalBefore - totalAfter) / totalBefore) * 100)
    : 0;

  // Médias
  const avgIntensityBefore = pointsBefore.length > 0
    ? pointsBefore.reduce((sum, p) => sum + p.intensity, 0) / pointsBefore.length
    : 0;

  const avgIntensityAfter = pointsAfter.length > 0
    ? pointsAfter.reduce((sum, p) => sum + p.intensity, 0) / pointsAfter.length
    : 0;

  return {
    improvementPercentage,
    regionsImproved,
    regionsWorsened,
    totalPointsBefore: pointsBefore.length,
    totalPointsAfter: pointsAfter.length,
    avgIntensityBefore,
    avgIntensityAfter,
  };
}

