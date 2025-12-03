import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PainMapCanvas } from './PainMapCanvas';
import { PainEvolutionChart } from './PainEvolutionChart';
import { PainMapHistory } from './PainMapHistory';
import { usePainMaps, usePainEvolution, usePainStatistics, useCreatePainMap, useUpdatePainMap } from '@/hooks/usePainMaps';
import { useAuth } from '@/hooks/useAuth';
import type { PainMapPoint, PainIntensity } from '@/types/painMap';
import { TrendingDown, TrendingUp, Minus, CheckCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PainMapManagerProps {
  patientId: string;
  sessionId?: string;
  appointmentId?: string;
  readOnly?: boolean;
}

export function PainMapManager({ patientId, sessionId, appointmentId, readOnly = false }: PainMapManagerProps) {
  const [painPoints, setPainPoints] = useState<PainMapPoint[]>([]);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const { user } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  
  const { data: painMaps = [], isLoading } = usePainMaps(patientId);
  const { data: painEvolution = [] } = usePainEvolution(patientId);
  const { data: stats } = usePainStatistics(patientId);
  const createPainMap = useCreatePainMap();
  const updatePainMap = useUpdatePainMap();

  const globalPainLevel = painPoints.length > 0 
    ? Math.round(painPoints.reduce((sum, p) => sum + p.intensity, 0) / painPoints.length) as PainIntensity
    : 0;

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!user || painPoints.length === 0 || readOnly) return;

    const currentData = JSON.stringify(painPoints);
    if (currentData === lastSavedRef.current) return;

    setSaveStatus('saving');

    const painMapData = {
      patient_id: patientId,
      session_id: sessionId,
      appointment_id: appointmentId,
      recorded_at: new Date().toISOString(),
      pain_points: painPoints,
      global_pain_level: globalPainLevel,
      notes: notes || null,
      created_by: user.id
    };

    try {
      await createPainMap.mutateAsync(painMapData);
      lastSavedRef.current = currentData;
      setSaveStatus('saved');
      
      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Erro ao salvar mapa de dor:', error);
      setSaveStatus('idle');
    }
  }, [user, painPoints, patientId, sessionId, appointmentId, globalPainLevel, notes, createPainMap, readOnly]);

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
          <PainMapCanvas 
            painPoints={painPoints}
            onPainPointsChange={setPainPoints}
            readOnly={readOnly}
          />
          
          {!readOnly && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Nível Global de Dor</p>
                  <p className="text-3xl font-bold text-primary">{globalPainLevel}/10</p>
                </div>
                
                {/* Auto-save status indicator */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                  {saveStatus === 'idle' && painPoints.length > 0 && (
                    <span className="text-xs">Auto-save ativo</span>
                  )}
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evolution" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Select value={chartType} onValueChange={(v: any) => setChartType(v)}>
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
          <PainEvolutionChart data={painEvolution} chartType={chartType} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <PainMapHistory 
            painMaps={painMaps}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
