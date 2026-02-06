import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PainMapCanvas } from './PainMapCanvas';
import { PainEvolutionChart } from '@/components/pain-map/PainEvolutionChart';
import { PainMapHistory } from './PainMapHistory';
import { PainGauge } from '@/components/pain-map/PainGauge';
import { EvaScaleBar } from '@/components/pain-map/EvaScaleBar';
import { PainPointsList } from '@/components/pain-map/PainPointsList';
import { PainPointDetailPanel } from '@/components/pain-map/PainPointDetailPanel';
import { usePainMaps, usePainEvolution, usePainStatistics, useCreatePainMap, useUpdatePainMap } from '@/hooks/usePainMaps';
import { useAuth } from '@/contexts/AuthContext';
import type { PainMapPoint, PainIntensity } from '@/types/painMap';
import type { PainPoint } from '@/components/pain-map/BodyMap';
import { TrendingDown, TrendingUp, Minus, CheckCircle2, Loader2, List } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface PainMapManagerProps {
  patientId: string;
  sessionId?: string;
  appointmentId?: string;
  readOnly?: boolean;
}

export function PainMapManager({ patientId, sessionId, _appointmentId, readOnly = false }: PainMapManagerProps) {
  const [painPoints, setPainPoints] = useState<PainMapPoint[]>([]);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [is3DMode, setIs3DMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const { user } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');

  const { patientMaps: painMaps = [], isLoading } = usePainMaps({ patientId });
  const { data: painEvolution = [] } = usePainEvolution(patientId);
  const { data: stats } = usePainStatistics(patientId);
  const createPainMap = useCreatePainMap();
   
  const _updatePainMap = useUpdatePainMap();

  const [selectedPointForDetail, setSelectedPointForDetail] = useState<PainPoint | null>(null);
  const [selectedIntensity, setSelectedIntensity] = useState<PainIntensity>(5);

  const globalPainLevel = painPoints.length > 0
    ? Math.round(painPoints.reduce((sum, p) => sum + p.intensity, 0) / painPoints.length) as PainIntensity
    : 0;

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!user || painPoints.length === 0 || readOnly || !sessionId) return;

    const currentData = JSON.stringify(painPoints);
    if (currentData === lastSavedRef.current) return;

    setSaveStatus('saving');

    // Converter PainMapPoint para formato do BodyMap (PainPoint)
    const bodyMapPoints: Omit<import('@/components/pain-map/BodyMap').PainPoint, 'id'>[] = painPoints.map(p => ({
      regionCode: p.region,
      region: p.region,
      intensity: p.intensity,
      painType: p.painType as PainPoint['painType'],
      notes: p.description,
      x: p.x,
      y: p.y,
    }));

    try {
      // Usar 'front' como view padrão (pode ser melhorado para detectar automaticamente)
      await createPainMap.mutateAsync({
        sessionId,
        view: 'front',
        points: bodyMapPoints,
      });
      lastSavedRef.current = currentData;
      setSaveStatus('saved');

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      logger.error('Erro ao salvar mapa de dor', error, 'PainMapManager');
      setSaveStatus('error');
    }
  }, [user, painPoints, sessionId, createPainMap, readOnly]);

  // Auto-save effect with debounce
  useEffect(() => {
    if (painPoints.length === 0 || readOnly) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds delay)
    saveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [painPoints, autoSave, readOnly]);

  const getTrendIcon = () => {
    if (!stats) return <Minus className="w-4 h-4" />;

    switch (stats.improvementTrend) {
      case 'improving':
        return <TrendingDown className="w-4 h-4 text-green-600" />;
      case 'worsening':
        return <TrendingUp className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getTrendLabel = () => {
    if (!stats) return 'Sem dados';

    switch (stats.improvementTrend) {
      case 'improving':
        return 'Melhorando';
      case 'worsening':
        return 'Piorando';
      default:
        return 'Estável';
    }
  };

  // Converter PainMapPoint para PainPoint (BodyMap)
  const convertToBodyMapPoint = useCallback((point: PainMapPoint): PainPoint => {
    return {
      id: `point-${point.x}-${point.y}`,
      regionCode: point.region,
      region: point.region,
      intensity: point.intensity,
      painType: point.painType as PainPoint['painType'],
      notes: point.description,
      x: point.x,
      y: point.y,
    };
  }, []);

  const handlePointUpdate = useCallback((point: PainPoint) => {
    const updatedPoint: PainMapPoint = {
      region: point.region as PainMapPoint['region'],
      intensity: Math.min(10, Math.max(0, point.intensity)) as PainIntensity,
      painType: point.painType as PainMapPoint['painType'],
      description: point.notes,
      x: point.x,
      y: point.y,
    };

    setPainPoints(prev => {
      const index = prev.findIndex(p => p.x === point.x && p.y === point.y);
      if (index >= 0) {
        const newPoints = [...prev];
        newPoints[index] = updatedPoint;
        return newPoints;
      }
      return prev;
    });

    if (selectedPointForDetail?.id === point.id) {
      setSelectedPointForDetail(point);
    }
  }, [selectedPointForDetail]);

  const handlePointRemove = useCallback((pointId: string) => {
    setPainPoints(prev => prev.filter((p, _index) => `point-${p.x}-${p.y}` !== pointId));
    if (selectedPointForDetail?.id === pointId) {
      setSelectedPointForDetail(null);
    }
  }, [selectedPointForDetail]);

  const bodyMapPoints: PainPoint[] = painPoints.map(convertToBodyMapPoint);

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      {stats && painMaps.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Dor Média</p>
              <p className="text-2xl font-bold">{stats.averagePainLevel.toFixed(1)}/10</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Redução</p>
              <p className="text-2xl font-bold text-green-600">-{stats.painReduction.toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tendência</p>
              <div className="flex items-center gap-2">
                {getTrendIcon()}
                <span className="text-lg font-semibold">{getTrendLabel()}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Registros</p>
              <p className="text-2xl font-bold">{painMaps.length}</p>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Mapa Atual</TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4 mt-6">
          <div className="flex justify-end mb-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="3d-mode" className="text-sm font-medium">Modo 3D Realista</Label>
              <Switch
                id="3d-mode"
                checked={is3DMode}
                onCheckedChange={setIs3DMode}
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className={is3DMode ? "w-full" : "lg:w-2/3"}>
              <PainMapCanvas
                painPoints={painPoints}
                onPainPointsChange={setPainPoints}
                readOnly={readOnly}
                variant={is3DMode ? '3d' : '2d'}
                evolutionData={painEvolution}
              />
            </div>

            {!is3DMode && (
              <Card className="lg:w-1/3 p-4 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium">Nível Global de Dor</p>
                    <PainGauge
                      score={globalPainLevel * 10}
                      intensity={globalPainLevel}
                      size="md"
                    />
                  </div>

                  <div className="mb-4">
                    <EvaScaleBar
                      value={selectedIntensity}
                      onChange={(v) => setSelectedIntensity(v as PainIntensity)}
                      disabled={readOnly}
                    />
                  </div>

                  <div className="mb-4">
                    <Button
                      className="w-full hidden" // Hidden or removed
                      variant="outline"
                      disabled={painPoints.length === 0}
                    >
                      <List className="w-4 h-4 mr-2" />
                      Ver Pontos ({painPoints.length})
                    </Button>
                  </div>

                  {/* Lista de pontos sempre visível */}
                  <div className="flex-1 min-h-0 border-t pt-4">
                    <p className="text-sm font-medium mb-2">Pontos Registrados ({painPoints.length})</p>
                    <PainPointsList
                      points={bodyMapPoints}
                      onPointEdit={(point) => setSelectedPointForDetail(point)}
                      onPointRemove={handlePointRemove}
                      className="h-[200px]"
                    />
                  </div>
                </div>


                {/* Auto-save status indicator */}
                {!readOnly && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-auto pt-4 border-t">
                    {saveStatus === 'saving' && (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    )}
                    {saveStatus === 'saved' && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Salvo automaticamente</span>
                      </>
                    )}
                    {saveStatus === 'error' && (
                      <>
                        <TrendingUp className="w-4 h-4 text-red-600 rotate-45" />
                        <span className="text-red-600 font-medium">Erro ao salvar (Tente novamente)</span>
                      </>
                    )}
                    {saveStatus === 'idle' && painPoints.length > 0 && (
                      <span className="text-xs">Auto-save ativo</span>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="evolution" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Select value={chartType} onValueChange={(v: 'line' | 'area' | 'bar') => setChartType(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Linha</SelectItem>
                <SelectItem value="area">Área</SelectItem>
                <SelectItem value="bar">Barras</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PainEvolutionChart
            evolutionData={painEvolution}
            showStats={true}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <PainMapHistory
            painMaps={painMaps}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>



      {/* Painel de detalhes do ponto */}
      {
        selectedPointForDetail && (
          <div className="fixed right-4 top-20 z-50 w-96 max-w-[calc(100vw-2rem)]">
            <PainPointDetailPanel
              point={selectedPointForDetail}
              onUpdate={handlePointUpdate}
              onDelete={handlePointRemove}
              onClose={() => setSelectedPointForDetail(null)}
            />
          </div>
        )
      }
    </div >
  );
}
