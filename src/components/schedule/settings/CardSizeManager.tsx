import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useCardSize } from '@/hooks/useCardSize';
import { CARD_SIZE_CONFIGS, DEFAULT_CARD_SIZE } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { Minimize, Maximize, Frame, Square, RotateCcw, Sparkles, Clock } from 'lucide-react';
import type { CardSize } from '@/types/agenda';
import { toast } from '@/hooks/use-toast';

const SIZE_ICONS: Record<CardSize, React.ReactNode> = {
  extra_small: <Minimize className="w-4 h-4" />,
  small: <Square className="w-4 h-4" />,
  medium: <Frame className="w-4 h-4" />,
  large: <Maximize className="w-4 h-4" />,
};

const SIZE_COLORS: Record<CardSize, string> = {
  extra_small: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  small: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  medium: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
  large: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
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
        "relative flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left group",
        "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
          : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex items-center justify-between w-full mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
            isSelected ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted group-hover:bg-primary/10"
          )}>
            {SIZE_ICONS[size]}
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
        {isSelected && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            Ativo
          </div>
        )}
      </div>

      {/* Visual preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Fontes:</span>
          <span className="font-mono">{config.timeFontSize}px / {config.nameFontSize}px</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Avatar:</span>
          <span>{config.showAvatar ? 'Sim' : 'Não'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Tipo:</span>
          <span>{config.showType ? 'Visível' : 'Oculto'}</span>
        </div>
      </div>
    </button>
  );
}

// Slot height range: 30px (compact) to 120px (spacious)
const MIN_SLOT_HEIGHT = 30;
const MAX_SLOT_HEIGHT = 120;
const DEFAULT_SLOT_HEIGHT = 60;

function SlotHeightControl({
  slotHeight,
  onSlotHeightChange,
}: {
  slotHeight: number;
  onSlotHeightChange: (value: number) => void;
}) {
  const [inputValue, setInputValue] = useState(slotHeight.toString());

  const handleSliderChange = (value: number[]) => {
    const newHeight = value[0];
    setInputValue(newHeight.toString());
    onSlotHeightChange(newHeight);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const value = parseInt(inputValue, 10);
    if (isNaN(value) || value < MIN_SLOT_HEIGHT) {
      setInputValue(MIN_SLOT_HEIGHT.toString());
      onSlotHeightChange(MIN_SLOT_HEIGHT);
    } else if (value > MAX_SLOT_HEIGHT) {
      setInputValue(MAX_SLOT_HEIGHT.toString());
      onSlotHeightChange(MAX_SLOT_HEIGHT);
    } else {
      onSlotHeightChange(value);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  // Calculate visual preview
  const previewSlots = Array.from({ length: 3 }, (_, i) => i + 1);
  const percentage = ((slotHeight - MIN_SLOT_HEIGHT) / (MAX_SLOT_HEIGHT - MIN_SLOT_HEIGHT)) * 100;

  return (
    <div className="space-y-6">
      {/* Slider with visual feedback */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="slot-height" className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Altura dos Slots de Horário
          </Label>
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
            <Input
              id="slot-height"
              type="number"
              min={MIN_SLOT_HEIGHT}
              max={MAX_SLOT_HEIGHT}
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className="w-16 h-8 text-center border-0 bg-transparent p-0 font-mono text-sm"
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
        </div>

        <div className="relative pt-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <Slider
          value={[slotHeight]}
          onValueChange={handleSliderChange}
          min={MIN_SLOT_HEIGHT}
          max={MAX_SLOT_HEIGHT}
          step={5}
          className="opacity-0 absolute inset-0 cursor-pointer"
        />
      </div>

      {/* Visual preview of slots */}
      <div className="p-4 bg-muted/30 rounded-xl border">
        <p className="text-xs font-medium text-muted-foreground mb-3">Pré-visualização dos Slots</p>
        <div className="space-y-1">
          {previewSlots.map((slot) => (
            <div
              key={slot}
              className="bg-background border border-border rounded-md flex items-center justify-center transition-all"
              style={{ height: `${slotHeight}px`, minHeight: `${slotHeight}px` }}
            >
              <span className="text-xs text-muted-foreground">
                {String(7 + Math.floor((slot - 1) / 2)).padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className={cn(
          "p-3 rounded-lg border text-center transition-colors",
          slotHeight <= 50
            ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
            : "bg-muted/30 border-border"
        )}>
          <p className="font-medium">Compacto</p>
          <p className="text-muted-foreground">30-50px</p>
        </div>
        <div className={cn(
          "p-3 rounded-lg border text-center transition-colors",
          slotHeight > 50 && slotHeight <= 80
            ? "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"
            : "bg-muted/30 border-border"
        )}>
          <p className="font-medium">Normal</p>
          <p className="text-muted-foreground">55-80px</p>
        </div>
        <div className={cn(
          "p-3 rounded-lg border text-center transition-colors",
          slotHeight > 80
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
            : "bg-muted/30 border-border"
        )}>
          <p className="font-medium">Espaçoso</p>
          <p className="text-muted-foreground">85-120px</p>
        </div>
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

  // Convert heightScale (0-10) to actual slot height (30-120px)
  const slotHeight = useMemo(() => {
    return Math.round(MIN_SLOT_HEIGHT + (heightScale / 10) * (MAX_SLOT_HEIGHT - MIN_SLOT_HEIGHT));
  }, [heightScale]);

  const hasCustomSettings = currentCardSize !== DEFAULT_CARD_SIZE || heightScale !== 5;

  const handleSlotHeightChange = (newHeight: number) => {
    // Convert back to 0-10 scale
    const newScale = Math.round(((newHeight - MIN_SLOT_HEIGHT) / (MAX_SLOT_HEIGHT - MIN_SLOT_HEIGHT)) * 10);
    setHeightScale(newScale);
    toast({
      title: 'Altura dos slots atualizada',
      description: `Os slots de horário agora têm ${newHeight}px de altura.`,
    });
  };

  const handleReset = () => {
    resetToDefault();
    toast({
      title: 'Configurações resetadas',
      description: 'Voltou para as configurações padrão.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with description */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Aparência da Agenda</h2>
            <p className="text-muted-foreground">
              Personalize o tamanho dos cards e a altura dos slots de horário
            </p>
          </div>
        </div>
        {hasCustomSettings && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetar
          </Button>
        )}
      </div>

      {/* Size Options - Cleaner layout */}
      <Card className={cn(
        "border-2 transition-all",
        SIZE_COLORS[currentCardSize]
      )}>
        <CardContent className="pt-6">
          <Label className="text-sm font-medium mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Tamanho do conteúdo dos cards
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
        </CardContent>
      </Card>

      {/* Slot Height Control - Direct and Clear */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Altura dos Slots de Horário
            </CardTitle>
            <CardDescription>
              Ajuste a altura de cada linha/slot da agenda. Os cards se adaptam ao espaço disponível.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <SlotHeightControl
            slotHeight={slotHeight}
            onSlotHeightChange={handleSlotHeightChange}
          />
        </CardContent>
      </Card>

      {/* Tips section - More visually appealing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Dica de Produtividade</p>
              <p className="text-xs text-muted-foreground">
                Use slots menores para ver mais agendamentos de uma vez na tela.
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
              <Frame className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Leitura Facilitada</p>
              <p className="text-xs text-muted-foreground">
                Use slots maiores para melhorar a legibilidade dos detalhes dos agendamentos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
