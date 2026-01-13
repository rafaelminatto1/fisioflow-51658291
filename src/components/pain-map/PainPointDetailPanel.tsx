import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PainPoint } from './BodyMap';
import { PainGauge } from './PainGauge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface PainPointDetailPanelProps {
  point: PainPoint | null;
  onUpdate?: (point: PainPoint) => void;
  onDelete?: (pointId: string) => void;
  onClose?: () => void;
  evolutionData?: Array<{ date: string; intensity: number }>;
  className?: string;
}

// Qualidades da dor
const PAIN_QUALITIES = [
  { id: 'queimacao', label: 'Queimação', icon: '🔥' },
  { id: 'pontada', label: 'Pontada', icon: '⚡' },
  { id: 'latejante', label: 'Latejante', icon: '💓' },
  { id: 'irradiada', label: 'Irradiada', icon: '↗️' },
  { id: 'peso', label: 'Peso', icon: '⚖️' },
  { id: 'pressao', label: 'Pressão', icon: '⬇️' },
] as const;

// Função para obter cor baseada na intensidade
const getIntensityColor = (intensity: number): string => {
  if (intensity <= 2) return '#22c55e';
  if (intensity <= 4) return '#eab308';
  if (intensity <= 6) return '#f97316';
  if (intensity <= 8) return '#ef4444';
  return '#7f1d1d';
};

export function PainPointDetailPanel({
  point,
  onUpdate,
  onDelete,
  onClose,
  evolutionData = [],
  className,
}: PainPointDetailPanelProps) {
  const [selectedQualities, setSelectedQualities] = useState<string[]>([]);
  const [intensity, setIntensity] = useState(point?.intensity ?? 5);
  const [notes, setNotes] = useState(point?.notes ?? '');

  // Processar dados de evolução para o gráfico
  const chartData = useMemo(() => {
    if (evolutionData.length === 0) {
      // Dados mock para demonstração se não houver histórico
      return [
        { month: 'Jan', intensity: 4 },
        { month: 'Fev', intensity: 5 },
        { month: 'Mar', intensity: 6 },
        { month: 'Abr', intensity: intensity },
      ];
    }
    
    return evolutionData.map((item, _index) => ({
      month: new Date(item.date).toLocaleDateString('pt-BR', { month: 'short' }),
      intensity: item.intensity,
    }));
  }, [evolutionData, intensity]);

  if (!point) return null;

  const color = getIntensityColor(intensity);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...point,
        intensity: intensity as PainPoint['intensity'],
        notes,
      });
    }
  };

  const handleDelete = () => {
    if (onDelete && confirm('Deseja realmente remover este ponto de dor?')) {
      onDelete(point.id);
    }
  };

  const handleQualityToggle = (qualityId: string) => {
    setSelectedQualities((prev) =>
      prev.includes(qualityId)
        ? prev.filter((id) => id !== qualityId)
        : [...prev, qualityId]
    );
  };

  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <CardTitle className="text-xl font-bold">{point.region}</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              {point.regionCode} • Registrado
            </p>
          </div>
          <div className="flex gap-2">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Gauge de Intensidade */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-2">
              Intensidade (VAS)
            </p>
            <div className="flex flex-col items-center justify-center">
              <PainGauge score={intensity * 10} intensity={intensity} size="sm" showLabel={false} />
            </div>
          </div>

          {/* Gráfico de Evolução */}
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-2">
              Evolução
            </p>
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="0" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 8 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip />
                  <Bar 
                    dataKey="intensity" 
                    fill={color}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Slider de Intensidade */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-semibold text-foreground">
              Intensidade (VAS)
            </Label>
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary"
              style={{
                borderColor: color,
                color: color,
              }}
            >
              {intensity} - {
                intensity === 0 ? 'Sem Dor' :
                intensity <= 2 ? 'Leve' :
                intensity <= 4 ? 'Moderada' :
                intensity <= 6 ? 'Moderada' :
                intensity <= 8 ? 'Forte' :
                'Insuportável'
              }
            </Badge>
          </div>
          <Slider
            value={[intensity]}
            onValueChange={([value]) => setIntensity(value)}
            min={0}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground px-1">
            <span>Leve</span>
            <span>Moderada</span>
            <span>Intensa</span>
          </div>
        </div>

        {/* Qualidade da Dor */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground block mb-2 uppercase tracking-wide">
            Qualidade da Dor
          </Label>
          <div className="flex flex-wrap gap-2">
            {PAIN_QUALITIES.map((quality) => (
              <label
                key={quality.id}
                className="cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={selectedQualities.includes(quality.id)}
                  onChange={() => handleQualityToggle(quality.id)}
                />
                <div
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    'peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary',
                    'border-border bg-background text-foreground',
                    'hover:border-primary/50'
                  )}
                >
                  {quality.icon} {quality.label}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Observações
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Descreva características específicas da dor..."
            rows={3}
            className="text-sm"
          />
        </div>

        {/* Botão Salvar */}
        <Button
          className="w-full bg-foreground text-background hover:opacity-90"
          onClick={handleSave}
        >
          Confirmar Alterações
        </Button>
      </CardContent>
    </Card>
  );
}

