import React, { useState, useMemo, useCallback, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useCardSize } from '@/hooks/useCardSize';
import { CARD_SIZE_CONFIGS, DEFAULT_CARD_SIZE } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { Minimize, Maximize, Frame, Square, RotateCcw, Sparkles, Clock, Type } from 'lucide-react';
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

const SizeOption = memo(function SizeOption({ size, currentSize, onSelect }: SizeOptionProps) {
  const config = CARD_SIZE_CONFIGS[size];
  const isSelected = currentSize === size;

  const handleClick = useCallback(() => {
    onSelect(size);
  }, [size, onSelect]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left group",
        "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
          : "border-border hover:border-primary/50"
      )}
      aria-pressed={isSelected}
      aria-label={`Selecionar tamanho ${config.label}`}
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
});

// Slot height range: 30px (compact) to 120px (spacious)
const MIN_SLOT_HEIGHT = 30;
const MAX_SLOT_HEIGHT = 120;

// Font scale range: 50% to 150%
const MIN_FONT_SCALE = 0;
const MAX_FONT_SCALE = 10;

/**
 * Custom hook to manage input state with change detection.
 * Only triggers onChange when the value actually changes.
 */
function useInputWithChangeDetection(
  currentValue: number,
  onChange: (value: number) => void,
  formatValue: (value: string) => number = (v) => parseInt(v, 10)
) {
  const [inputValue, setInputValue] = useState(currentValue.toString());
  const [originalValue, setOriginalValue] = useState(currentValue);

  React.useEffect(() => {
    setInputValue(currentValue.toString());
    setOriginalValue(currentValue);
  }, [currentValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleFocus = useCallback(() => {
    setOriginalValue(currentValue);
  }, [currentValue]);

  const handleBlur = useCallback(() => {
    const parsedValue = formatValue(inputValue);

    if (!isNaN(parsedValue) && parsedValue !== originalValue) {
      onChange(parsedValue);
    } else {
      setInputValue(originalValue.toString());
    }
  }, [inputValue, originalValue, onChange, formatValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  }, [handleBlur]);

  return {
    inputValue,
    setInputValue,
    handleChange,
    handleFocus,
    handleBlur,
    handleKeyDown,
  };
}

function SlotHeightControl({
  slotHeight,
  onSlotHeightChange,
}: {
  slotHeight: number;
  onSlotHeightChange: (value: number) => void;
}) {
  const formatValue = useCallback((value: string) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < MIN_SLOT_HEIGHT) return MIN_SLOT_HEIGHT;
    if (parsed > MAX_SLOT_HEIGHT) return MAX_SLOT_HEIGHT;
    return parsed;
  }, []);

  const {
    inputValue,
    handleChange,
    handleFocus,
    handleBlur,
    handleKeyDown,
  } = useInputWithChangeDetection(slotHeight, onSlotHeightChange, formatValue);

  const handleSliderChange = useCallback((value: number[]) => {
    const newHeight = value[0];
    setInputValue(newHeight.toString());
    onSlotHeightChange(newHeight);
  }, [onSlotHeightChange, setInputValue]);

  // Calculate visual percentage
  const percentage = useMemo(() =>
    ((slotHeight - MIN_SLOT_HEIGHT) / (MAX_SLOT_HEIGHT - MIN_SLOT_HEIGHT)) * 100,
    [slotHeight]
  );

  // Sample appointments for preview
  const sampleAppointments = useMemo(() => [
    { time: '07:00', name: 'Maria Santos', type: 'Fisioterapia', color: 'bg-blue-500' },
    { time: '07:30', name: 'João Silva', type: 'Ortopédica', color: 'bg-emerald-500' },
    { time: '08:00', name: 'Ana Costa', type: 'Neurológica', color: 'bg-purple-500' },
  ], []);

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
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-16 h-8 text-center border-0 bg-transparent p-0 font-mono text-sm"
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
        </div>

        {/* Colored progress bar */}
        <div className="relative">
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <Slider
            value={[slotHeight]}
            onValueChange={handleSliderChange}
            min={MIN_SLOT_HEIGHT}
            max={MAX_SLOT_HEIGHT}
            step={5}
            className="cursor-pointer"
          />
        </div>
      </div>

      {/* Visual preview of slots with realistic appointments */}
      <div className="p-4 bg-muted/30 rounded-xl border">
        <p className="text-xs font-medium text-muted-foreground mb-3">Pré-visualização dos Slots</p>
        <div className="space-y-1">
          {sampleAppointments.map((apt, index) => (
            <div
              key={index}
              className="relative bg-background border border-border rounded-md overflow-hidden transition-all duration-300"
              style={{ height: `${slotHeight}px`, minHeight: `${slotHeight}px` }}
            >
              {/* Time indicator on the left */}
              <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-muted/50 border-r border-border">
                <span className="text-xs font-mono text-muted-foreground">{apt.time}</span>
              </div>
              {/* Appointment card */}
              <div
                className={cn(
                  "absolute left-14 right-2 top-1 bottom-1 rounded-md flex flex-col justify-center px-2 text-white transition-all",
                  apt.color
                )}
              >
                <p
                  className="font-medium truncate transition-all"
                  style={{ fontSize: slotHeight >= 60 ? '11px' : slotHeight >= 45 ? '10px' : '9px' }}
                >
                  {apt.name}
                </p>
                {slotHeight >= 50 && (
                  <p
                    className="text-white/80 truncate transition-all"
                    style={{ fontSize: slotHeight >= 60 ? '10px' : '9px' }}
                  >
                    {apt.type}
                  </p>
                )}
              </div>
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

// Font scale control component
function FontScaleControl({
  fontScale,
  onFontScaleChange,
  fontPercentage,
}: {
  fontScale: number;
  onFontScaleChange: (value: number) => void;
  fontPercentage: number;
}) {
  const formatValue = useCallback((value: string) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 50) return 0;
    if (parsed > 150) return 10;
    return Math.round(((parsed - 50) / 100) * 10);
  }, []);

  const {
    inputValue,
    handleChange,
    handleFocus,
    handleBlur,
    handleKeyDown,
  } = useInputWithChangeDetection(fontScale, onFontScaleChange, formatValue);

  const handleSliderChange = useCallback((value: number[]) => {
    const newScale = value[0];
    onFontScaleChange(newScale);
  }, [onFontScaleChange]);

  // Calculate visual percentage for progress bar
  const progressPercentage = useMemo(() =>
    (fontScale / MAX_FONT_SCALE) * 100,
    [fontScale]
  );

  // Base font sizes for preview (px)
  const baseTimeFontSize = 10;
  const baseNameFontSize = 11;
  const baseTypeFontSize = 9;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="font-scale" className="text-sm font-medium flex items-center gap-2">
            <Type className="w-4 h-4" />
            Tamanho da Fonte dos Cards
          </Label>
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
            <Input
              id="font-scale"
              type="number"
              min={50}
              max={150}
              value={inputValue}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-16 h-8 text-center border-0 bg-transparent p-0 font-mono text-sm"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>

        {/* Colored progress bar */}
        <div className="relative">
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <Slider
            value={[fontScale]}
            onValueChange={handleSliderChange}
            min={MIN_FONT_SCALE}
            max={MAX_FONT_SCALE}
            step={1}
            className="cursor-pointer"
          />
        </div>
      </div>

      {/* Visual preview of font sizes - realistic appointment card */}
      <div className="p-4 bg-muted/30 rounded-xl border">
        <p className="text-xs font-medium text-muted-foreground mb-3">Pré-visualização</p>
        <div className="space-y-2">
          {/* Sample appointment card */}
          <div className="relative h-16 bg-emerald-500 rounded-lg overflow-hidden">
            <div className="absolute inset-0 p-2 flex flex-col justify-center text-white">
              <div className="flex items-center gap-2">
                <span
                  className="font-mono transition-all"
                  style={{ fontSize: `${baseTimeFontSize * (fontPercentage / 100)}px` }}
                >
                  08:00
                </span>
                <span className="text-white/60">-</span>
                <span
                  className="font-medium truncate transition-all"
                  style={{ fontSize: `${baseNameFontSize * (fontPercentage / 100)}px` }}
                >
                  Maria Santos
                </span>
              </div>
              <span
                className="text-white/80 truncate transition-all"
                style={{ fontSize: `${baseTypeFontSize * (fontPercentage / 100)}px` }}
              >
                Fisioterapia Ortopédica
              </span>
            </div>
          </div>
          {/* Second sample for comparison */}
          <div className="relative h-16 bg-blue-500 rounded-lg overflow-hidden">
            <div className="absolute inset-0 p-2 flex flex-col justify-center text-white">
              <div className="flex items-center gap-2">
                <span
                  className="font-mono transition-all"
                  style={{ fontSize: `${baseTimeFontSize * (fontPercentage / 100)}px` }}
                >
                  09:30
                </span>
                <span className="text-white/60">-</span>
                <span
                  className="font-medium truncate transition-all"
                  style={{ fontSize: `${baseNameFontSize * (fontPercentage / 100)}px` }}
                >
                  João Carlos Oliveira
                </span>
              </div>
              <span
                className="text-white/80 truncate transition-all"
                style={{ fontSize: `${baseTypeFontSize * (fontPercentage / 100)}px` }}
              >
                Reabilitação Neurológica
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className={cn(
          "p-3 rounded-lg border text-center transition-colors",
          fontScale <= 3
            ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
            : "bg-muted/30 border-border"
        )}>
          <p className="font-medium">Compacto</p>
          <p className="text-muted-foreground">50-80%</p>
        </div>
        <div className={cn(
          "p-3 rounded-lg border text-center transition-colors",
          fontScale > 3 && fontScale <= 7
            ? "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"
            : "bg-muted/30 border-border"
        )}>
          <p className="font-medium">Normal</p>
          <p className="text-muted-foreground">80-120%</p>
        </div>
        <div className={cn(
          "p-3 rounded-lg border text-center transition-colors",
          fontScale > 7
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
            : "bg-muted/30 border-border"
        )}>
          <p className="font-medium">Grande</p>
          <p className="text-muted-foreground">120-150%</p>
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
    fontScale,
    setFontScale,
    fontPercentage,
    resetToDefault,
  } = useCardSize();

  // Convert heightScale (0-10) to actual slot height (30-120px)
  const slotHeight = useMemo(() => {
    return Math.round(MIN_SLOT_HEIGHT + (heightScale / 10) * (MAX_SLOT_HEIGHT - MIN_SLOT_HEIGHT));
  }, [heightScale]);

  const hasCustomSettings = useMemo(() =>
    currentCardSize !== DEFAULT_CARD_SIZE || heightScale !== 5 || fontScale !== 5,
    [currentCardSize, heightScale, fontScale]
  );

  const handleSlotHeightChange = useCallback((newHeight: number) => {
    // Convert back to 0-10 scale
    const newScale = Math.round(((newHeight - MIN_SLOT_HEIGHT) / (MAX_SLOT_HEIGHT - MIN_SLOT_HEIGHT)) * 10);
    setHeightScale(newScale);
    toast({
      title: 'Altura dos slots atualizada',
      description: `Os slots de horário agora têm ${newHeight}px de altura.`,
    });
  }, [setHeightScale]);

  const handleFontScaleChange = useCallback((newScale: number) => {
    setFontScale(newScale);
    const percentage = 50 + (newScale / 10) * 100;
    toast({
      title: 'Tamanho da fonte atualizado',
      description: `A fonte dos cards agora está em ${percentage.toFixed(0)}%.`,
    });
  }, [setFontScale]);

  const handleReset = useCallback(() => {
    resetToDefault();
    toast({
      title: 'Configurações resetadas',
      description: 'Voltou para as configurações padrão.',
    });
  }, [resetToDefault]);

  const handleSizeSelect = useCallback((size: CardSize) => {
    setCurrentSize(size);
  }, [setCurrentSize]);

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
              onSelect={handleSizeSelect}
            />
            <SizeOption
              size="small"
              currentSize={currentCardSize}
              onSelect={handleSizeSelect}
            />
            <SizeOption
              size="medium"
              currentSize={currentCardSize}
              onSelect={handleSizeSelect}
            />
            <SizeOption
              size="large"
              currentSize={currentCardSize}
              onSelect={handleSizeSelect}
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

      {/* Font Scale Control */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Type className="w-5 h-5" />
              Tamanho da Fonte dos Cards
            </CardTitle>
            <CardDescription>
              Ajuste o tamanho da fonte do conteúdo dos cards. A fonte se adapta proporcionalmente.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <FontScaleControl
            fontScale={fontScale}
            onFontScaleChange={handleFontScaleChange}
            fontPercentage={fontPercentage}
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
