import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PainScaleProps {
  value: number;
  onChange: (value: number) => void;
  location?: string[];
  onLocationChange?: (locations: string[]) => void;
  quality?: string;
  onQualityChange?: (quality: string) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  className?: string;
}

const painDescriptions = {
  0: { label: 'Sem Dor', description: 'Nenhuma dor presente', color: 'bg-green-100 text-green-800' },
  1: { label: 'Mínima', description: 'Dor muito leve', color: 'bg-green-100 text-green-800' },
  2: { label: 'Leve', description: 'Desconforto menor', color: 'bg-yellow-100 text-yellow-800' },
  3: { label: 'Moderada Baixa', description: 'Dor tolerável', color: 'bg-yellow-100 text-yellow-800' },
  4: { label: 'Moderada', description: 'Dor incômoda', color: 'bg-orange-100 text-orange-800' },
  5: { label: 'Moderada Alta', description: 'Dor que interfere nas atividades', color: 'bg-orange-100 text-orange-800' },
  6: { label: 'Severa Baixa', description: 'Dor intensa', color: 'bg-red-100 text-red-800' },
  7: { label: 'Severa', description: 'Dor muito intensa', color: 'bg-red-100 text-red-800' },
  8: { label: 'Severa Alta', description: 'Dor quase insuportável', color: 'bg-red-200 text-red-900' },
  9: { label: 'Extrema', description: 'Dor insuportável', color: 'bg-red-200 text-red-900' },
  10: { label: 'Máxima', description: 'Pior dor imaginável', color: 'bg-red-300 text-red-950' },
};

const bodyLocations = [
  'Pescoço', 'Ombro Direito', 'Ombro Esquerdo', 'Braço Direito', 'Braço Esquerdo',
  'Cotovelo Direito', 'Cotovelo Esquerdo', 'Punho Direito', 'Punho Esquerdo',
  'Coluna Cervical', 'Coluna Torácica', 'Coluna Lombar', 'Sacro', 'Cóccix',
  'Quadril Direito', 'Quadril Esquerdo', 'Coxa Direita', 'Coxa Esquerda',
  'Joelho Direito', 'Joelho Esquerdo', 'Perna Direita', 'Perna Esquerda',
  'Tornozelo Direito', 'Tornozelo Esquerdo', 'Pé Direito', 'Pé Esquerdo'
];

const painQualities = [
  'Queimação', 'Pontada', 'Latejante', 'Cólica', 'Pressão', 'Aperto',
  'Choque', 'Formigamento', 'Dormência', 'Peso', 'Rigidez', 'Fadiga'
];

export function PainScale({
  value,
  onChange,
  location = [],
  onLocationChange,
  quality = '',
  onQualityChange,
  notes = '',
  onNotesChange,
  className
}: PainScaleProps) {
  const [selectedLocations, setSelectedLocations] = useState<string[]>(location);
  const [selectedQuality, setSelectedQuality] = useState(quality);

  const handleLocationToggle = (loc: string) => {
    const updated = selectedLocations.includes(loc)
      ? selectedLocations.filter(l => l !== loc)
      : [...selectedLocations, loc];
    setSelectedLocations(updated);
    onLocationChange?.(updated);
  };

  const handleQualitySelect = (q: string) => {
    const newQuality = selectedQuality === q ? '' : q;
    setSelectedQuality(newQuality);
    onQualityChange?.(newQuality);
  };

  const currentPain = painDescriptions[value as keyof typeof painDescriptions];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Pain Intensity Scale */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Escala de Dor (0-10)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecione o número que melhor representa a intensidade da dor atual
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 11 }, (_, i) => {
              return (
                <Button
                  key={i}
                  variant={value === i ? 'default' : 'outline'}
                  onClick={() => onChange(i)}
                  className={cn(
                    'h-12 w-12 text-lg font-bold',
                    value === i && 'ring-2 ring-primary ring-offset-2'
                  )}
                >
                  {i}
                </Button>
              );
            })}
          </div>
          
          {currentPain && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Badge className={currentPain.color}>
                {value}/10 - {currentPain.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {currentPain.description}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pain Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Localização da Dor</CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecione todas as áreas onde sente dor (múltipla seleção)
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {bodyLocations.map((loc) => (
              <Button
                key={loc}
                variant={selectedLocations.includes(loc) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLocationToggle(loc)}
                className={cn(
                  'text-xs',
                  selectedLocations.includes(loc) && 'bg-primary text-primary-foreground'
                )}
              >
                {loc}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pain Quality */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Qualidade da Dor</CardTitle>
          <p className="text-sm text-muted-foreground">
            Como você descreveria a sensação da dor?
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {painQualities.map((q) => (
              <Button
                key={q}
                variant={selectedQuality === q ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQualitySelect(q)}
                className="text-xs"
              >
                {q}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Observações Adicionais</CardTitle>
          <p className="text-sm text-muted-foreground">
            Fatores que agravam ou aliviam a dor, padrões temporais, etc.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange?.(e.target.value)}
            placeholder="Descreva fatores que pioram ou melhoram a dor, quando é mais intensa, se interfere no sono, etc."
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}