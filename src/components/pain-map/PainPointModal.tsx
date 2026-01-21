import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Label } from '@/components/shared/ui/label';
import { Slider } from '@/components/shared/ui/slider';
import { Textarea } from '@/components/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import type { PainPoint } from './BodyMap';
import { EvaScaleBar } from './EvaScaleBar';
import { getMusclesByRegion } from '@/lib/data/bodyMuscles';

interface PainPointModalProps {
  point: PainPoint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (point: PainPoint) => void;
  onCancel?: () => void;
  region?: string;
  view?: 'front' | 'back'; // Adicionado para buscar músculos da vista correta
}

const PAIN_TYPES = [
  { value: 'sharp', label: 'Aguda ⚡', description: 'Dor pontual e intensa' },
  { value: 'throbbing', label: 'Latejante 💓', description: 'Dor pulsante' },
  { value: 'burning', label: 'Queimação 🔥', description: 'Sensação de ardência' },
  { value: 'tingling', label: 'Formigamento ✨', description: 'Sensação de agulhadas' },
  { value: 'numbness', label: 'Dormência ❄️', description: 'Perda de sensibilidade' },
  { value: 'stiffness', label: 'Rigidez 🔒', description: 'Dificuldade de movimento' },
] as const;

export function PainPointModal({
  point,
  open,
  onOpenChange,
  onSave,
  onCancel,
  region,
  view = 'front',
}: PainPointModalProps) {
  const [intensity, setIntensity] = useState<number>(point?.intensity ?? 5);
  const [painType, setPainType] = useState<PainPoint['painType']>(
    point?.painType ?? 'sharp'
  );
  const [notes, setNotes] = useState(point?.notes ?? '');
  const [muscleCode, setMuscleCode] = useState(point?.muscleCode ?? '');
  const [muscleName, setMuscleName] = useState(point?.muscleName ?? '');

  // Buscar músculos disponíveis para a região
  const availableMuscles = point?.regionCode
    ? getMusclesByRegion(point.regionCode, view)
    : [];

  // Resetar valores quando o ponto mudar ou modal abrir/fechar
  useEffect(() => {
    if (open) {
      if (point) {
        setIntensity(point.intensity);
        setPainType(point.painType);
        setNotes(point.notes ?? '');
        setMuscleCode(point.muscleCode ?? '');
        setMuscleName(point.muscleName ?? '');
      } else {
        // Reset para valores padrão quando criando novo ponto
        setIntensity(5);
        setPainType('sharp');
        setNotes('');
        setMuscleCode('');
        setMuscleName('');
      }
    } else {
      // Limpar ao fechar
      setNotes('');
      setMuscleCode('');
      setMuscleName('');
    }
  }, [point, open]);

  const handleSave = () => {
    if (!point && !region) return;

    const newPoint: PainPoint = {
      id: point?.id ?? `temp-${Date.now()}`,
      regionCode: point?.regionCode ?? region ?? '',
      region: point?.region ?? region ?? '',
      muscleCode: muscleCode || undefined,
      muscleName: muscleName || undefined,
      intensity: intensity as PainPoint['intensity'],
      painType,
      notes: notes || undefined,
      x: point?.x ?? 50,
      y: point?.y ?? 50,
    };

    onSave?.(newPoint);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes da Dor</DialogTitle>
          <DialogDescription>
            {point?.region || region || 'Nova região'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Escala EVA */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Intensidade (VAS)</Label>
            <EvaScaleBar
              value={intensity}
              onChange={setIntensity}
              showLabels={true}
            />
            <Slider
              value={[intensity]}
              onValueChange={([value]) => setIntensity(value)}
              min={0}
              max={10}
              step={1}
              className="w-full mt-2"
            />
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              <span>Leve</span>
              <span>Moderada</span>
              <span>Intensa</span>
            </div>
          </div>

          {/* Tipo de Sensação */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Tipo de Sensação</Label>
            <Select
              value={painType}
              onValueChange={(value) => setPainType(value as PainPoint['painType'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAIN_TYPES.map((type) => (
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

          {/* Seletor de Músculo (quando disponível) */}
          {availableMuscles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Músculo Específico (opcional)</Label>
              <Select
                value={muscleCode}
                onValueChange={(value) => {
                  const selected = availableMuscles.find(m => m.code === value);
                  if (selected) {
                    setMuscleCode(selected.code);
                    setMuscleName(selected.name);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um músculo ou deixe em branco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Região geral</SelectItem>
                  {availableMuscles.map((muscle) => (
                    <SelectItem key={muscle.code} value={muscle.code}>
                      <div className="flex flex-col">
                        <span className="font-medium">{muscle.name}</span>
                        <span className="text-xs text-muted-foreground">{muscle.nameEn}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {muscleName && (
                <p className="text-xs text-primary">
                  💪 Músculo selecionado: {muscleName}
                </p>
              )}
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva características específicas da dor..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground"
            onClick={handleSave}
          >
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

