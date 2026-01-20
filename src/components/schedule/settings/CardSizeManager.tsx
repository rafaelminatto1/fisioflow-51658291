import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useCardSize, type CustomFontSizes } from '@/hooks/useCardSize';
import { CARD_SIZE_CONFIGS, DEFAULT_CARD_SIZE, STATUS_CONFIG } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { Minimize, Maximize, Frame, Square, RotateCcw, Sparkles, Clock, Type, Eye, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { CardSize } from '@/types/agenda';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const SIZE_ICONS: Record<CardSize, React.ReactNode> = {
  extra_small: <Minimize className="w-4 h-4" />,
  small: <Square className="w-4 h-4" />,
  medium: <Frame className="w-4 h-4" />,
  large: <Maximize className="w-4 h-4" />,
};

const SIZE_COLORS: Record<CardSize, { bg: string; border: string; accent: string }> = {
  extra_small: { bg: 'bg-slate-50 dark:bg-slate-900/50', border: 'border-slate-200 dark:border-slate-700', accent: 'text-slate-600' },
  small: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', accent: 'text-blue-600' },
  medium: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', accent: 'text-purple-600' },
  large: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', accent: 'text-emerald-600' },
};

// Slot height range: 30px (compact) to 120px (spacious)
const MIN_SLOT_HEIGHT = 30;
const MAX_SLOT_HEIGHT = 120;
const DEFAULT_SLOT_HEIGHT = 60;

// Font size range: 6px to 18px
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 18;

// Quick presets for slot height
const SLOT_HEIGHT_PRESETS = [
  { label: 'Compacto', value: 40, icon: '—' },
  { label: 'Normal', value: 60, icon: '— —' },
  { label: 'Espaçoso', value: 90, icon: '— — —' },
];

// Quick presets for font sizes
const FONT_PRESETS = {
  small: { time: 8, name: 9, type: 7 },
  medium: { time: 10, name: 11, type: 9 },
  large: { time: 12, name: 13, type: 11 },
};

interface SizeOptionProps {
  size: CardSize;
  currentSize: CardSize;
  onSelect: (size: CardSize) => void;
}

function SizeOption({ size, currentSize, onSelect }: SizeOptionProps) {
  const config = CARD_SIZE_CONFIGS[size];
  const isSelected = currentSize === size;
  const colors = SIZE_COLORS[size];

  return (
    <motion.button
      onClick={() => onSelect(size)}
      className={cn(
        "relative flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left",
        colors.bg,
        colors.border,
        "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        isSelected
          ? "ring-2 ring-offset-2 ring-primary shadow-md"
          : "hover:border-primary/40"
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between w-full mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
            isSelected
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-white/50 dark:bg-white/10 shadow-sm"
          )}>
            {SIZE_ICONS[size]}
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <AnimatePresence mode="wait">
          {isSelected && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
            >
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-md">
                <Sparkles className="w-3 h-3" />
                Ativo
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Visual specs */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col items-center p-2 rounded-lg bg-white/40 dark:bg-black/20">
          <span className="font-medium">Horário</span>
          <span className="font-mono text-muted-foreground">{config.timeFontSize}px</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-white/40 dark:bg-black/20">
          <span className="font-medium">Nome</span>
          <span className="font-mono text-muted-foreground">{config.nameFontSize}px</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-white/40 dark:bg-black/20">
          <span className="font-medium">Tipo</span>
          <span className={cn("font-medium", !config.showType && "text-muted-foreground line-through")}>
            {config.showType ? `${config.typeFontSize}px` : 'Oculto'}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

interface SliderControlProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
  presets?: Array<{ label: string; value: number; icon?: string }>;
  renderValue?: (value: number) => string;
}

function SliderControl({
  label,
  description,
  icon,
  value,
  min,
  max,
  step,
  onChange,
  unit = 'px',
  presets,
  renderValue,
}: SliderControlProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleSliderChange = (newValue: number[]) => {
    onChange(newValue[0]);
    setInputValue(newValue[0].toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsedValue = parseInt(inputValue, 10);
    if (isNaN(parsedValue) || parsedValue < min) {
      setInputValue(min.toString());
      onChange(min);
    } else if (parsedValue > max) {
      setInputValue(max.toString());
      onChange(max);
    } else {
      onChange(parsedValue);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg transition-all",
            isFocused ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {icon}
          </div>
          <div className="space-y-0.5">
            <Label className="text-sm font-medium flex items-center gap-2">
              {label}
            </Label>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        {/* Value display with input */}
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border",
          isFocused ? "border-primary bg-primary/5" : "border-border bg-muted/50"
        )}>
          <Input
            type="number"
            min={min}
            max={max}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setIsFocused(true)}
            className="w-16 h-6 text-center border-0 bg-transparent p-0 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <span className="text-xs text-muted-foreground font-medium">{unit}</span>
        </div>
      </div>

      {/* Quick presets */}
      {presets && (
        <div className="flex items-center gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant={value === preset.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                onChange(preset.value);
                setInputValue(preset.value.toString());
              }}
              className="h-7 text-xs"
            >
              <span className="mr-1">{preset.icon}</span>
              {preset.label}
            </Button>
          ))}
        </div>
      )}

      {/* Slider with progress */}
      <div className="relative space-y-2">
        {/* Progress bar background */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary/60"
            style={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Slider */}
        <div className="relative h-6 -mt-4">
          <Slider
            value={[value]}
            onValueChange={handleSliderChange}
            min={min}
            max={max}
            step={step}
            className="z-10"
          />
        </div>

        {/* Range labels */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{min}{unit}</span>
          <span className="font-medium text-primary">{renderValue ? renderValue(value) : `${value}${unit}`}</span>
          <span>{max}{unit}</span>
        </div>
      </div>
    </div>
  );
}

interface LivePreviewCardProps {
  slotHeight: number;
  fontSizes: CustomFontSizes;
  cardSize: CardSize;
}

function LivePreviewCard({ slotHeight, fontSizes, cardSize }: LivePreviewCardProps) {
  const sizeConfig = CARD_SIZE_CONFIGS[cardSize];
  const statusConfig = STATUS_CONFIG.agendado;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Eye className="w-4 h-4" />
        Pré-visualização em Tempo Real
      </div>

      <div className="relative p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 rounded-xl border-2 border-dashed border-border overflow-hidden">
        {/* Grid lines representing slots */}
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "relative rounded-lg border-2 flex items-center px-3 transition-all",
                i === 1
                  ? "bg-blue-100/90 dark:bg-blue-500/20 border-blue-400 shadow-sm"
                  : "bg-white/60 dark:bg-white/5 border-border/50"
              )}
              style={{
                height: `${slotHeight}px`,
                minHeight: `${slotHeight}px`,
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              {i === 1 ? (
                <div className="flex items-center gap-2 w-full">
                  {/* Time */}
                  <span
                    className="font-mono font-semibold text-blue-900 dark:text-blue-400"
                    style={{ fontSize: `${fontSizes.timeFontSize}px` }}
                  >
                    09:00
                  </span>

                  {/* Accent bar */}
                  <div className="w-1 h-3 rounded-full bg-blue-600" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <span
                      className="block font-bold text-blue-900 dark:text-blue-400 truncate"
                      style={{ fontSize: `${fontSizes.nameFontSize}px` }}
                    >
                      Maria Santos
                    </span>
                    {sizeConfig.showType && (
                      <span
                        className="block text-blue-700/70 dark:text-blue-300/70 truncate"
                        style={{ fontSize: `${fontSizes.typeFontSize}px` }}
                      >
                        Individual
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span
                  className="text-xs text-muted-foreground/50 font-mono"
                  style={{ fontSize: `${Math.max(fontSizes.timeFontSize - 1, 8)}px` }}
                >
                  {i === 0 ? '08:00' : '10:00'}
                </span>
              )}
            </motion.div>
          ))}
        </div>

        {/* Scale indicator */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/80 backdrop-blur text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Ao vivo
        </div>
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <CollapsibleCard>
      <CollapsibleTrigger
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </CollapsibleTrigger>
      <AnimatePresence mode="wait">
        {isOpen && (
          <CollapsibleContent className="px-4 pb-4">
            {children}
          </CollapsibleContent>
        )}
      </AnimatePresence>
    </CollapsibleCard>
  );
}

// Simple collapsible components since we don't have the Radix ones
function CollapsibleCard({ children }: { children: React.ReactNode }) {
  return <Card className="border-2">{children}</Card>;
}

function CollapsibleTrigger({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <button className={className} onClick={onClick}>{children}</button>;
}

function CollapsibleContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function CardSizeManager() {
  const {
    cardSize: currentCardSize,
    setCardSize: setCurrentSize,
    heightScale,
    setHeightScale,
    customFontSizes,
    setCustomFontSizes,
    resetToDefault,
  } = useCardSize();

  // Convert heightScale (0-10) to actual slot height (30-120px)
  const slotHeight = useMemo(() => {
    return Math.round(MIN_SLOT_HEIGHT + (heightScale / 10) * (MAX_SLOT_HEIGHT - MIN_SLOT_HEIGHT));
  }, [heightScale]);

  const defaultFontSizes = useMemo(() => ({
    timeFontSize: CARD_SIZE_CONFIGS[DEFAULT_CARD_SIZE].timeFontSize,
    nameFontSize: CARD_SIZE_CONFIGS[DEFAULT_CARD_SIZE].nameFontSize,
    typeFontSize: CARD_SIZE_CONFIGS[DEFAULT_CARD_SIZE].typeFontSize,
  }), []);

  const hasCustomSettings = currentCardSize !== DEFAULT_CARD_SIZE ||
    heightScale !== 5 ||
    customFontSizes.timeFontSize !== defaultFontSizes.timeFontSize ||
    customFontSizes.nameFontSize !== defaultFontSizes.nameFontSize ||
    customFontSizes.typeFontSize !== defaultFontSizes.typeFontSize;

  const handleSlotHeightChange = (newHeight: number) => {
    const newScale = Math.round(((newHeight - MIN_SLOT_HEIGHT) / (MAX_SLOT_HEIGHT - MIN_SLOT_HEIGHT)) * 10);
    setHeightScale(newScale);
  };

  const handleFontSizeChange = (key: keyof CustomFontSizes, value: number) => {
    setCustomFontSizes({
      ...customFontSizes,
      [key]: value,
    });
  };

  const handleApplyFontPreset = (preset: keyof typeof FONT_PRESETS) => {
    setCustomFontSizes(FONT_PRESETS[preset]);
    toast({
      title: 'Preset aplicado',
      description: `Tamanhos de fonte "${preset}" aplicados.`,
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Aparência da Agenda</h2>
              <p className="text-muted-foreground text-sm">
                Personalize a visualização dos cards e slots de horário
              </p>
            </div>
          </div>
        </div>
        {hasCustomSettings && (
          <Button variant="outline" size="sm" onClick={handleReset} className="shrink-0">
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column - Controls */}
        <div className="xl:col-span-2 space-y-6">
          {/* Card Size Selection */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Frame className="w-5 h-5" />
                Tamanho dos Cards
              </CardTitle>
              <CardDescription>
                Escolha o preset que melhor se adapta ao seu fluxo de trabalho
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SizeOption size="extra_small" currentSize={currentCardSize} onSelect={setCurrentSize} />
                <SizeOption size="small" currentSize={currentCardSize} onSelect={setCurrentSize} />
                <SizeOption size="medium" currentSize={currentCardSize} onSelect={setCurrentSize} />
                <SizeOption size="large" currentSize={currentCardSize} onSelect={setCurrentSize} />
              </div>
            </CardContent>
          </Card>

          {/* Slot Height Control */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Altura dos Slots
              </CardTitle>
              <CardDescription>
                Ajuste a altura vertical de cada linha da agenda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SliderControl
                label="Altura do Slot"
                description="Affects the vertical space for each time slot"
                icon={<Clock className="w-4 h-4" />}
                value={slotHeight}
                min={MIN_SLOT_HEIGHT}
                max={MAX_SLOT_HEIGHT}
                step={5}
                onChange={handleSlotHeightChange}
                presets={SLOT_HEIGHT_PRESETS}
              />
            </CardContent>
          </Card>

          {/* Font Size Control */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Type className="w-5 h-5" />
                    Tamanho das Fontes
                  </CardTitle>
                  <CardDescription>
                    Ajuste individualmente cada elemento de texto
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {Object.keys(FONT_PRESETS).map((preset) => (
                    <Button
                      key={preset}
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyFontPreset(preset as keyof typeof FONT_PRESETS)}
                      className="h-8 text-xs"
                    >
                      {preset === 'small' && 'Pequeno'}
                      {preset === 'medium' && 'Médio'}
                      {preset === 'large' && 'Grande'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <SliderControl
                label="Fonte do Horário"
                description="Tamanho do texto de horário no card"
                icon={<Clock className="w-4 h-4" />}
                value={customFontSizes.timeFontSize}
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                step={1}
                onChange={(v) => handleFontSizeChange('timeFontSize', v)}
                renderValue={(v) => `${v}px`}
              />

              <SliderControl
                label="Fonte do Nome"
                description="Tamanho do texto do nome do paciente"
                icon={<Type className="w-4 h-4" />}
                value={customFontSizes.nameFontSize}
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                step={1}
                onChange={(v) => handleFontSizeChange('nameFontSize', v)}
                renderValue={(v) => `${v}px`}
              />

              <SliderControl
                label="Fonte do Tipo"
                description="Tamanho do texto do tipo de sessão"
                icon={<Frame className="w-4 h-4" />}
                value={customFontSizes.typeFontSize}
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                step={1}
                onChange={(v) => handleFontSizeChange('typeFontSize', v)}
                renderValue={(v) => `${v}px`}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column - Live Preview */}
        <div className="xl:col-span-1">
          <div className="sticky top-6">
            <LivePreviewCard
              slotHeight={slotHeight}
              fontSizes={customFontSizes}
              cardSize={currentCardSize}
            />

            {/* Tips */}
            <Card className="mt-4 border-2 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Dica</p>
                      <p className="text-xs text-muted-foreground">
                        Use slots menores para ver mais agendamentos na tela.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Acessibilidade</p>
                      <p className="text-xs text-muted-foreground">
                        Aumente as fontes para melhor leitura em telas menores.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
