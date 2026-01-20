import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useCardSize } from '@/hooks/useCardSize';
import { CARD_SIZE_CONFIGS, DEFAULT_CARD_SIZE } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { Minimize, Maximize, Frame, Square, Save, RotateCcw } from 'lucide-react';
import type { CardSize } from '@/types/agenda';
import { toast } from '@/hooks/use-toast';

const SIZE_ICONS: Record<CardSize, React.ReactNode> = {
  extra_small: <Minimize className="w-4 h-4" />,
  small: <Square className="w-4 h-4" />,
  medium: <Frame className="w-4 h-4" />,
  large: <Maximize className="w-4 h-4" />,
};

interface SizeOptionProps {
  size: CardSize;
  currentSize: CardSize;
  onSelect: (size: CardSize) => void;
}

function SizeOption({ size, currentSize, onSelect }: SizeOptionProps) {
  const config = CARD_SIZE_CONFIGS[size];
  const isSelected = currentSize === size;

  return (
    <button
      onClick={() => onSelect(size)}
      className={cn(
        "relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left",
        "hover:bg-slate-50 dark:hover:bg-slate-800",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border"
      )}
    >
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-md",
            isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            {SIZE_ICONS[size]}
          </div>
          <div>
            <p className="font-semibold text-sm">{config.label}</p>
            <p className="text-xs text-muted-foreground font-mono">{config.icon}</p>
          </div>
        </div>
        {isSelected && (
          <div className="w-3 h-3 rounded-full bg-primary ring-2 ring-primary/30" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">{config.description}</p>

      {/* Preview indicator */}
      <div className="mt-3 flex gap-1 items-end h-6">
        <div
          className="bg-primary/60 rounded-sm"
          style={{
            height: size === 'extra_small' ? '8px' : size === 'small' ? '12px' : size === 'medium' ? '16px' : '20px',
            width: '40px',
          }}
        />
        <div
          className="bg-primary/40 rounded-sm"
          style={{
            height: size === 'extra_small' ? '8px' : size === 'small' ? '12px' : size === 'medium' ? '16px' : '20px',
            width: '40px',
          }}
        />
        <div
          className="bg-primary/30 rounded-sm"
          style={{
            height: size === 'extra_small' ? '8px' : size === 'small' ? '12px' : size === 'medium' ? '16px' : '20px',
            width: '40px',
          }}
        />
      </div>
    </button>
  );
}

function HeightControl({
  heightScale,
  onHeightChange,
}: {
  heightScale: number;
  onHeightChange: (value: number) => void;
}) {
  const [inputValue, setInputValue] = useState(heightScale.toString());

  const handleSliderChange = (value: number[]) => {
    const newScale = value[0];
    setInputValue(newScale.toString());
    onHeightChange(newScale);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const value = parseInt(inputValue, 10);
    if (isNaN(value) || value < 0) {
      setInputValue('0');
      onHeightChange(0);
    } else if (value > 10) {
      setInputValue('10');
      onHeightChange(10);
    } else {
      onHeightChange(value);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="height-scale" className="text-sm font-medium">
          Altura dos Cards
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="height-scale"
            type="number"
            min={0}
            max={10}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-16 h-8 text-center"
          />
          <span className="text-xs text-muted-foreground">(0-10)</span>
        </div>
      </div>

      <Slider
        value={[heightScale]}
        onValueChange={handleSliderChange}
        min={0}
        max={10}
        step={1}
        className="py-2"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>0 (muito baixo)</span>
        <span>5 (normal)</span>
        <span>10 (muito alto)</span>
      </div>

      <div className="p-3 bg-muted/50 rounded-lg border border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Altura atual:</strong> {((0.5 + (heightScale / 10) * 1.5) * 100).toFixed(0)}% do tamanho normal
        </p>
      </div>
    </div>
  );
}

export function CardSizeManager() {
  const {
    cardSize: currentCardSize,
    setCardSize: setCurrentSize,
    heightScale,
    setHeightScale,
    resetToDefault,
  } = useCardSize();

  const [hasChanges, setHasChanges] = useState(false);
  const [tempHeightScale, setTempHeightScale] = useState(heightScale);

  const handleHeightChange = (value: number) => {
    setTempHeightScale(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    setHeightScale(tempHeightScale);
    setHasChanges(false);
    toast({
      title: 'Configuraes salvas',
      description: 'As alteraes foram salvas com sucesso.',
    });
  };

  const handleReset = () => {
    resetToDefault();
    setTempHeightScale(5);
    setHasChanges(false);
    toast({
      title: 'Configuraes resetadas',
      description: 'As configuraes voltaram ao padro.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Frame className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Tamanho dos Cards</CardTitle>
                <CardDescription>
                  Configure o tamanho dos cards de agendamento na agenda
                </CardDescription>
              </div>
            </div>
            {(currentCardSize !== DEFAULT_CARD_SIZE || hasChanges) && (
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Resetar
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Size Options */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-sm font-medium mb-4 block">Selecione o tamanho dos cards:</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SizeOption
              size="extra_small"
              currentSize={currentCardSize}
              onSelect={setCurrentSize}
            />
            <SizeOption
              size="small"
              currentSize={currentCardSize}
              onSelect={setCurrentSize}
            />
            <SizeOption
              size="medium"
              currentSize={currentCardSize}
              onSelect={setCurrentSize}
            />
            <SizeOption
              size="large"
              currentSize={currentCardSize}
              onSelect={setCurrentSize}
            />
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Dica:</strong> Tamanhos menores permitem ver mais agendamentos de uma vez.
              Tamanhos maiores mostram mais detalhes de cada agendamento.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Height Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Altura dos Cards</CardTitle>
          <CardDescription>
            Ajuste a altura vertical dos cards na agenda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HeightControl
            heightScale={tempHeightScale}
            onHeightChange={handleHeightChange}
          />

          {hasChanges && (
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTempHeightScale(heightScale);
                  setHasChanges(false);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alteraes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
