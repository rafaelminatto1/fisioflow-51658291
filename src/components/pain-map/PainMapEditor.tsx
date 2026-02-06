

// Helper function to generate UUID - using crypto.randomUUID() to avoid "ne is not a function" error in production

import { useState, useCallback } from 'react';
import { List, Save, Trash2 } from 'lucide-react';
import { BodyMap, PainPoint } from './BodyMap';
import { PainGauge } from './PainGauge';
import { EvaScaleBar } from './EvaScaleBar';
import { PainPointsBottomSheet } from './PainPointsBottomSheet';
import { PainPointModal } from './PainPointModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const uuidv4 = (): string => crypto.randomUUID();

interface PainMapEditorProps {
  sessionId: string;
  patientName: string;
  initialFrontPoints?: PainPoint[];
  initialBackPoints?: PainPoint[];
  onSave: (data: { view: 'front' | 'back'; points: PainPoint[] }[]) => Promise<void>;
  onCancel?: () => void;
}

const PAIN_TYPES = [
  { value: 'sharp', label: 'Aguda ⚡', description: 'Dor pontual e intensa' },
  { value: 'throbbing', label: 'Latejante 💓', description: 'Dor pulsante' },
  { value: 'burning', label: 'Queimação 🔥', description: 'Sensação de ardência' },
  { value: 'tingling', label: 'Formigamento ✨', description: 'Sensação de agulhadas' },
  { value: 'numbness', label: 'Dormência ❄️', description: 'Perda de sensibilidade' },
  { value: 'stiffness', label: 'Rigidez 🔒', description: 'Dificuldade de movimento' },
] as const;

export function PainMapEditor({
  sessionId: _sessionId,
  patientName,
  initialFrontPoints = [],
  initialBackPoints = [],
  onSave,
  onCancel,
}: PainMapEditorProps) {
  const [activeView, setActiveView] = useState<'front' | 'back'>('front');
  const [frontPoints, setFrontPoints] = useState<PainPoint[]>(initialFrontPoints);
  const [backPoints, setBackPoints] = useState<PainPoint[]>(initialBackPoints);
  const [selectedIntensity, setSelectedIntensity] = useState(5);
  const [selectedPainType, setSelectedPainType] = useState<PainPoint['painType']>('sharp');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<PainPoint | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  const setCurrentPoints = activeView === 'front' ? setFrontPoints : setBackPoints;

  // Adicionar ponto
  const handlePointAdd = useCallback((point: Omit<PainPoint, 'id'>) => {
    const newPoint: PainPoint = {
      ...point,
      id: uuidv4(),
      notes: notes || undefined,
    };
    setCurrentPoints(prev => [...prev, newPoint]);
    setNotes('');
    // Abrir modal para edição após adicionar
    setSelectedPoint(newPoint);
    setModalOpen(true);
  }, [setCurrentPoints, notes]);

  // Remover ponto
  const handlePointRemove = useCallback((pointId: string) => {
    setCurrentPoints(prev => prev.filter(p => p.id !== pointId));
  }, [setCurrentPoints]);

  // Atualizar ponto
  const handlePointUpdate = useCallback((point: PainPoint) => {
    setCurrentPoints(prev => prev.map(p => p.id === point.id ? point : p));
    setSelectedPoint(null);
    setModalOpen(false);
  }, [setCurrentPoints]);

  // Editar ponto
  const handlePointEdit = useCallback((point: PainPoint) => {
    setSelectedPoint(point);
    setModalOpen(true);
  }, []);

  // Limpar todos os pontos
  const handleClearAll = useCallback(() => {
    setFrontPoints([]);
    setBackPoints([]);
  }, []);

  // Salvar
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data: { view: 'front' | 'back'; points: PainPoint[] }[] = [];
      
      if (frontPoints.length > 0) {
        data.push({ view: 'front', points: frontPoints });
      }
      if (backPoints.length > 0) {
        data.push({ view: 'back', points: backPoints });
      }

      await onSave(data);
    } finally {
      setIsSaving(false);
    }
  };

  const totalPoints = frontPoints.length + backPoints.length;
  const avgIntensity = totalPoints > 0
    ? Math.round([...frontPoints, ...backPoints].reduce((sum, p) => sum + p.intensity, 0) / totalPoints * 10) / 10
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      {/* Painel de controles */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Paciente */}
          <div>
            <Label className="text-sm text-muted-foreground">Paciente</Label>
            <p className="font-medium">{patientName}</p>
          </div>

          {/* Gauge de Score Total */}
          {totalPoints > 0 && (
            <div className="flex flex-col items-center justify-center py-4 bg-muted/30 rounded-lg border border-border">
              <PainGauge 
                score={avgIntensity * 10} 
                intensity={Math.round(avgIntensity)}
                size="md"
              />
            </div>
          )}

          {/* Intensidade - Escala EVA */}
          <div className="space-y-3">
            <Label>Intensidade da Dor (EVA)</Label>
            <EvaScaleBar
              value={selectedIntensity}
              onChange={setSelectedIntensity}
              showLabels={true}
            />
            <p className="text-xs text-muted-foreground text-center">
              {getIntensityLabel(selectedIntensity)}
            </p>
          </div>

          {/* Tipo de dor */}
          <div className="space-y-2">
            <Label>Tipo de Dor</Label>
            <Select value={selectedPainType} onValueChange={(v) => setSelectedPainType(v as PainPoint['painType'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAIN_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva características específicas da dor..."
              rows={3}
            />
          </div>

          {/* Estatísticas */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total de pontos:</span>
              <span className="font-medium">{totalPoints}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frente:</span>
              <span>{frontPoints.length} pontos</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Costas:</span>
              <span>{backPoints.length} pontos</span>
            </div>
            {totalPoints > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Intensidade média:</span>
                <Badge variant="outline">{avgIntensity}/10</Badge>
              </div>
            )}
            
            {/* Botão para abrir lista de pontos */}
            {totalPoints > 0 && (
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => setBottomSheetOpen(true)}
              >
                <List className="w-4 h-4 mr-2" />
                Ver Todos os Pontos ({totalPoints})
              </Button>
            )}
          </div>

          {/* Ações */}
          <div className="space-y-2">
            <Button 
              onClick={handleSave} 
              className="w-full" 
              disabled={totalPoints === 0 || isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Mapa de Dor'}
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClearAll} 
                className="flex-1"
                disabled={totalPoints === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar
              </Button>
              {onCancel && (
                <Button variant="ghost" onClick={onCancel} className="flex-1">
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mapa corporal */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Mapa de Dor</CardTitle>
            <p className="text-sm text-muted-foreground">
              Clique para marcar pontos de dor
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'front' | 'back')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="front" className="relative">
                Frente
                {frontPoints.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">
                    {frontPoints.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="back" className="relative">
                Costas
                {backPoints.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">
                    {backPoints.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="front" className="mt-0">
              <div className="aspect-[3/4] max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] border rounded-lg bg-muted/20">
                <BodyMap
                  view="front"
                  points={frontPoints}
                  onPointAdd={handlePointAdd}
                  onPointRemove={handlePointRemove}
                  onPointUpdate={handlePointUpdate}
                  selectedIntensity={selectedIntensity}
                  selectedPainType={selectedPainType}
                />
              </div>
            </TabsContent>

            <TabsContent value="back" className="mt-0">
              <div className="aspect-[3/4] max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] border rounded-lg bg-muted/20">
                <BodyMap
                  view="back"
                  points={backPoints}
                  onPointAdd={handlePointAdd}
                  onPointRemove={handlePointRemove}
                  onPointUpdate={handlePointUpdate}
                  selectedIntensity={selectedIntensity}
                  selectedPainType={selectedPainType}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Bottom Sheet - Lista de Pontos */}
      <PainPointsBottomSheet
        points={[...frontPoints, ...backPoints]}
        onPointEdit={handlePointEdit}
        onPointRemove={handlePointRemove}
        open={bottomSheetOpen}
        onOpenChange={setBottomSheetOpen}
      />

      {/* Modal de Edição */}
      <PainPointModal
        point={selectedPoint}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handlePointUpdate}
        view={activeView}
      />
    </div>
  );
}

// Helpers
function getIntensityLabel(intensity: number): string {
  if (intensity === 0) return 'Sem dor';
  if (intensity <= 2) return 'Dor leve - desconforto mínimo';
  if (intensity <= 4) return 'Dor moderada - interfere nas atividades';
  if (intensity <= 6) return 'Dor alta - dificulta atividades diárias';
  if (intensity <= 8) return 'Dor severa - limita significativamente';
  return 'Dor extrema - incapacitante';
}

