/**
 * PainScaleInput - Escala Visual Analógica (EVA) de Dor
 * RF01.3 - Campo de avaliação de dor (0-10)
 *
 * Features:
 * - Visual slider com cores gradiente (verde -> amarelo -> vermelho)
 * - Seleção por clique ou arraste
 * - Input manual para valor preciso
 * - Campo para localização da dor
 * - Campo para característica da dor (tipo)
 * - Histórico visual dos valores anteriores
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Frown,
  Meh,
  Smile,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export interface PainScaleData {
  level: number; // 0-10
  location?: string;
  character?: string;
}

interface PainScaleInputProps {
  value?: PainScaleData;
  onChange?: (data: PainScaleData) => void;
  readonly?: boolean;
  history?: Array<{ date: string; level: number }>;
  showHistory?: boolean;
}

// Descrições para cada nível da escala
const PAIN_DESCRIPTIONS: Record<number, { text: string; color: string; icon: React.ReactNode }> = {
  0: { text: 'Sem dor', color: 'bg-green-500', icon: <Smile className="h-5 w-5" /> },
  1: { text: 'Dor mínima', color: 'bg-green-400', icon: <Smile className="h-5 w-5" /> },
  2: { text: 'Dor leve', color: 'bg-lime-400', icon: <Meh className="h-5 w-5" /> },
  3: { text: 'Dor leve', color: 'bg-lime-400', icon: <Meh className="h-5 w-5" /> },
  4: { text: 'Dor moderada', color: 'bg-yellow-400', icon: <Meh className="h-5 w-5" /> },
  5: { text: 'Dor moderada', color: 'bg-yellow-400', icon: <Meh className="h-5 w-5" /> },
  6: { text: 'Dor forte', color: 'bg-orange-400', icon: <Frown className="h-5 w-5" /> },
  7: { text: 'Dor forte', color: 'bg-orange-400', icon: <Frown className="h-5 w-5" /> },
  8: { text: 'Dor muito forte', color: 'bg-red-500', icon: <Frown className="h-5 w-5" /> },
  9: { text: 'Dor insuportável', color: 'bg-red-600', icon: <Frown className="h-5 w-5" /> },
  10: { text: 'A pior dor possível', color: 'bg-red-700', icon: <AlertCircle className="h-5 w-5" /> }
};

// Características comuns de dor
const PAIN_CHARACTERISTICS = [
  'Aguda/Faca',
  'Queimação',
  'Pulsátil',
  'Cólica',
  'Pressão/Peso',
  'Fadiga/Cansaço',
  'Latejante',
  'Amortecimento/Formigamento',
  'Pontada',
  'Cócegas/irritação'
];

export const PainScaleInput: React.FC<PainScaleInputProps> = ({
  value = { level: 0 },
  onChange,
  readonly = false,
  history = [],
  showHistory = true
}) => {
  const [inputValue, setInputValue] = useState(value.level.toString());

  const currentDescription = PAIN_DESCRIPTIONS[value.level] || PAIN_DESCRIPTIONS[0];

  // Atualiza input quando value muda externamente
  React.useEffect(() => {
    setInputValue(value.level.toString());
  }, [value.level]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setInputValue(newValue.toString());
    onChange?.({ ...value, level: newValue });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const numVal = parseInt(val);
    if (!isNaN(numVal) && numVal >= 0 && numVal <= 10) {
      onChange?.({ ...value, level: numVal });
    }
  };

  const handleQuickSelect = (level: number) => {
    setInputValue(level.toString());
    onChange?.({ ...value, level });
  };

  // Cálculo da posição do indicador
  const sliderPosition = `${(value.level / 10) * 100}%`;

  // Média de dor do histórico
  const avgPain = useMemo(() => {
    if (history.length === 0) return null;
    const sum = history.reduce((acc, h) => acc + h.level, 0);
    return Math.round(sum / history.length);
  }, [history]);

  return (
    <div className="space-y-4">
      {/* Header com valor atual e descrição */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full ${currentDescription.color} flex items-center justify-center text-white shadow-lg`}>
            {currentDescription.icon}
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{value.level}/10</div>
            <div className="text-sm text-muted-foreground">{currentDescription.text}</div>
          </div>
        </div>

        {avgPain !== null && showHistory && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="cursor-help">
                  Média: {avgPain}/10
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Média baseada em {history.length} avaliações anteriores</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Slider visual com gradiente */}
      {!readonly && (
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <Label htmlFor="pain-slider" className="text-sm font-medium mb-3 block">
              Nível de dor atual
            </Label>

            {/* Slider customizado com gradiente */}
            <div className="relative w-full h-8 rounded-full overflow-hidden shadow-inner">
              {/* Gradiente de fundo */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(to right, #22c55e 0%, #84cc16 20%, #eab308 40%, #f97316 60%, #ef4444 80%, #b91c1c 100%)'
                }}
              />

              {/* Slider input transparente sobreposto */}
              <input
                id="pain-slider"
                type="range"
                min="0"
                max="10"
                value={value.level}
                onChange={handleSliderChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={readonly}
              />

              {/* Indicador visual */}
              <div
                className="absolute top-0 h-full w-1 bg-white shadow-lg transform -translate-x-1/2 pointer-events-none transition-all duration-150"
                style={{ left: sliderPosition }}
              >
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-border" />
              </div>

              {/* Marcas numéricas */}
              <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                {[0, 2, 4, 6, 8, 10].map((num) => (
                  <span
                    key={num}
                    className={`text-xs font-bold ${
                      value.level >= num
                        ? 'text-white drop-shadow-md'
                        : 'text-white/70'
                    }`}
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>

            {/* Input manual para valor preciso */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 flex-1">
                <Label htmlFor="pain-input" className="text-sm text-muted-foreground whitespace-nowrap">
                  Valor exato:
                </Label>
                <Input
                  id="pain-input"
                  type="number"
                  min="0"
                  max="10"
                  value={inputValue}
                  onChange={handleInputChange}
                  className="w-20 h-9 text-center"
                  disabled={readonly}
                />
              </div>

              {/* Botões de seleção rápida */}
              <div className="flex gap-1">
                {[0, 5, 10].map((val) => (
                  <Button
                    key={val}
                    type="button"
                    variant={value.level === val ? "default" : "outline"}
                    size="sm"
                    className="h-9 px-3"
                    onClick={() => handleQuickSelect(val)}
                    disabled={readonly}
                  >
                    {val}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Localização da dor */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pain-location" className="text-sm font-medium mb-2 block">
            Localização da dor
          </Label>
          <Input
            id="pain-location"
            placeholder="Ex: Joelho direito, região lombar..."
            value={value.location || ''}
            onChange={(e) => onChange?.({ ...value, location: e.target.value })}
            disabled={readonly}
          />
        </div>

        <div>
          <Label htmlFor="pain-character" className="text-sm font-medium mb-2 block">
            Tipo/Característica
          </Label>
          <div className="relative">
            <Input
              id="pain-character"
              list="pain-characteristics"
              placeholder="Ex: Queimação, pontada..."
              value={value.character || ''}
              onChange={(e) => onChange?.({ ...value, character: e.target.value })}
              disabled={readonly}
            />
            <datalist id="pain-characteristics">
              {PAIN_CHARACTERISTICS.map((char) => (
                <option key={char} value={char} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {/* Mini histórico visual */}
      {showHistory && history.length > 0 && (
        <TooltipProvider>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Histórico de dor
                </Label>
                <span className="text-xs text-muted-foreground">
                  {history.length} registro{history.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-end gap-1 h-12">
                {history.slice(-10).map((h, i) => {
                  const height = `${(h.level / 10) * 100}%`;
                  const colorClass = h.level <= 3 ? 'bg-green-500' :
                    h.level <= 6 ? 'bg-yellow-500' : 'bg-red-500';
                  return (
                    <Tooltip key={i} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex-1 rounded-t ${colorClass} hover:opacity-80 transition-opacity cursor-pointer`}
                          style={{ height }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">
                          {new Date(h.date).toLocaleDateString('pt-BR')}: {h.level}/10
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TooltipProvider>
      )}

      {/* Legenda rápida */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          Sem dor/Leve
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          Moderada
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          Forte/Insuportável
        </span>
      </div>
    </div>
  );
};

export default PainScaleInput;
