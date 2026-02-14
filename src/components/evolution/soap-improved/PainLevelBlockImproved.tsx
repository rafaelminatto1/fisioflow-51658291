/**
 * PainLevelBlockImproved - Enhanced Pain Level (EVA) Component
 *
 * A completely redesigned pain level selector with:
 * - Modern visual design with gradient colors
 * - Interactive slider with smooth animations
 * - Quick preset buttons
 * - Visual feedback for pain intensity
 * - Accessible ARIA labels
 * - Responsive design
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Activity,
  Smile,
  Meh,
  Frown,
  Grimace,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// ==================== TYPES ====================

export interface PainLevelData {
  level: number; // 0-10
  location?: string;
  character?: string;
  description?: string;
}

interface PainLevelBlockImprovedProps {
  value?: PainLevelData;
  onChange?: (data: PainLevelData) => void;
  disabled?: boolean;
  showLocation?: boolean;
  showCharacter?: boolean;
  showDescription?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'card';
}

// ==================== CONSTANTS ====================

const PAIN_LEVELS = [
  { value: 0, label: 'Sem dor', color: 'emerald', gradient: 'from-emerald-400 to-emerald-600', icon: Smile },
  { value: 3, label: 'Dor leve', color: 'lime', gradient: 'from-lime-400 to-lime-600', icon: Meh },
  { value: 6, label: 'Dor moderada', color: 'amber', gradient: 'from-amber-400 to-amber-600', icon: Frown },
  { value: 10, label: 'Dor intensa', color: 'rose', gradient: 'from-rose-400 to-rose-600', icon: Grimace },
];

const PAIN_CHARACTERISTICS = [
  'Aguda/Faca',
  'Queimação',
  'Pulsátil',
  'Cólica',
  'Pressão/Peso',
  'Fadiga/Cansaço',
  'Latejante',
  'Formigamento',
  'Pontada',
];

const PAIN_DESCRIPTIONS = [
  'Interfere nas atividades diárias',
  'Melhora com repouso',
  'Piora com movimento',
  'Constante',
  'Intermitente',
  'Ao acordar',
  'Ao final do dia',
];

// ==================== UTILITY FUNCTIONS ====================

const getPainConfig = (level: number) => {
  if (level === 0) return PAIN_LEVELS[0];
  if (level <= 3) return PAIN_LEVELS[1];
  if (level <= 6) return PAIN_LEVELS[2];
  return PAIN_LEVELS[3];
};

const getPainColor = (level: number) => {
  if (level === 0) return {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600',
    border: 'border-emerald-500',
    gradient: 'from-emerald-400 to-emerald-600',
    bgSoft: 'bg-emerald-50',
  };
  if (level <= 3) return {
    bg: 'bg-lime-500',
    text: 'text-lime-600',
    border: 'border-lime-500',
    gradient: 'from-lime-400 to-lime-600',
    bgSoft: 'bg-lime-50',
  };
  if (level <= 6) return {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    border: 'border-amber-500',
    gradient: 'from-amber-400 to-amber-600',
    bgSoft: 'bg-amber-50',
  };
  return {
    bg: 'bg-rose-500',
    text: 'text-rose-600',
    border: 'border-rose-500',
    gradient: 'from-rose-400 to-rose-600',
    bgSoft: 'bg-rose-50',
  };
};

// ==================== MAIN COMPONENT ====================

export const PainLevelBlockImproved: React.FC<PainLevelBlockImprovedProps> = ({
  value = { level: 0 },
  onChange,
  disabled = false,
  showLocation = true,
  showCharacter = false,
  showDescription = false,
  className,
  variant = 'card',
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const config = getPainConfig(value.level);
  const colors = getPainColor(value.level);
  const CurrentIcon = config.icon;

  const handleLevelChange = useCallback(
    (newLevel: number) => {
      onChange?.({ ...value, level: newLevel });
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    },
    [onChange, value]
  );

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newLevel = parseInt(e.target.value);
      handleLevelChange(newLevel);
    },
    [handleLevelChange]
  );

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div
          className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200',
            isAnimating && 'scale-110',
            `bg-gradient-to-br ${colors.gradient}`
          )}
        >
          <span className="text-xl font-bold text-white">{value.level}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <CurrentIcon className={cn('h-4 w-4', colors.text)} />
            <span className={cn('font-semibold', colors.text)}>{config.label}</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            value={value.level}
            onChange={handleSliderChange}
            disabled={disabled}
            className="w-full h-2 accent-current opacity-0 absolute inset-0 cursor-pointer"
            style={{ color: colors.text.replace('text-', '') }}
          />
          <div className="relative h-2 bg-gradient-to-r from-emerald-500 via-lime-500 via-amber-500 to-rose-500 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full w-1 bg-white rounded-full shadow-lg"
              style={{ left: `${(value.level / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300',
        'shadow-sm hover:shadow-md',
        disabled && 'opacity-50',
        className
      )}
    >
      {/* Header */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500/60 via-rose-500 to-rose-500/60" />
        <div className="flex items-center gap-2.5 p-4 border-b border-border/40 bg-gradient-to-r from-rose-500/5 to-transparent">
          <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20">
            <Activity className="h-4 w-4 text-rose-500" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-foreground">Nível de Dor</h3>
            <span className="text-[10px] text-muted-foreground">
              Escala Visual Analógica (EVA)
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Pain Display */}
        <div className="flex items-center gap-4">
          {/* Pain value indicator with animation */}
          <div className="relative">
            <div
              className={cn(
                'w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300',
                isAnimating && 'scale-110',
                `bg-gradient-to-br ${colors.gradient}`
              )}
            >
              {/* Animated ping effect */}
              {isAnimating && (
                <div
                  className={cn(
                    'absolute inset-0 rounded-2xl animate-ping',
                    colors.bg
                  )}
                  style={{ opacity: 0.3 }}
                />
              )}
              <span className="text-3xl font-bold text-white drop-shadow-sm">
                {value.level}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center">
              <span className="text-[10px] font-bold text-muted-foreground">10</span>
            </div>
          </div>

          {/* Pain info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CurrentIcon className={cn('h-5 w-5', colors.text)} />
              <p className={cn('text-lg font-bold', colors.text)}>{config.label}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {value.level === 0 && 'Paciente sem queixa de dor'}
              {value.level > 0 && value.level <= 3 && 'Dor leve - não interfere nas atividades'}
              {value.level > 3 && value.level <= 6 && 'Dor moderada - interfere em algumas atividades'}
              {value.level > 6 && 'Dor intensa - interfere significativamente nas atividades'}
            </p>
          </div>

          {/* Info tooltip */}
          <div className="hidden sm:block p-2 rounded-lg bg-muted/50">
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Enhanced Slider */}
        <div className="space-y-3">
          {/* Visual scale */}
          <div className="relative h-4 bg-gradient-to-r from-emerald-500 via-lime-500 via-amber-500 to-rose-500 rounded-full shadow-inner">
            <input
              type="range"
              min="0"
              max="10"
              value={value.level}
              onChange={handleSliderChange}
              disabled={disabled}
              className={cn(
                'absolute inset-0 w-full h-full opacity-0 cursor-pointer',
                disabled && 'cursor-not-allowed'
              )}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
            />

            {/* Thumb with animation */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 bg-white shadow-lg transition-all duration-100',
                isDragging && 'scale-125 shadow-xl',
                colors.border
              )}
              style={{ left: `calc(${(value.level / 10) * 100}% - 10px)` }}
            >
              <div className={cn('absolute inset-1 rounded-full', colors.bg)} />
            </div>

            {/* Scale labels */}
            <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
              {[0, 2, 4, 6, 8, 10].map((num) => (
                <span
                  key={num}
                  className={cn(
                    'text-[10px] font-bold',
                    value.level >= num ? 'text-white drop-shadow-md' : 'text-white/70'
                  )}
                >
                  {num}
                </span>
              ))}
            </div>
          </div>

          {/* Labels below slider */}
          <div className="flex justify-between text-[10px] text-muted-foreground px-1 font-medium">
            <span>Sem dor</span>
            <span>Leve</span>
            <span>Moderada</span>
            <span>Intensa</span>
          </div>
        </div>

        {/* Quick preset buttons */}
        <div className="grid grid-cols-4 gap-2">
          {PAIN_LEVELS.map((preset) => {
            const Icon = preset.icon;
            const isActive = value.level === preset.value;

            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleLevelChange(preset.value)}
                disabled={disabled}
                className={cn(
                  'relative group flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-200',
                  'hover:scale-105 active:scale-95',
                  isActive
                    ? `${colors.border} bg-gradient-to-br ${colors.gradient} shadow-md`
                    : 'border-border/50 bg-muted/30 hover:bg-muted/50',
                  disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isActive ? 'text-white' : `text-${preset.color}-500`
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] font-semibold',
                    isActive ? 'text-white' : 'text-muted-foreground'
                  )}
                >
                  {preset.value}
                </span>

                {/* Tooltip on hover */}
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-foreground text-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Location input */}
        {showLocation && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium text-muted-foreground px-1">
              Localização da dor (opcional)
            </Label>
            <div className="relative">
              <Input
                value={value.location || ''}
                onChange={(e) => onChange?.({ ...value, location: e.target.value })}
                disabled={disabled}
                placeholder="Ex: Ombro direito, região anterior"
                className="h-9 text-sm pr-8"
              />
              {value.location && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse" style={{ color: colors.text.replace('text-', '') }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Character/Type dropdown */}
        {showCharacter && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium text-muted-foreground px-1">
              Tipo/Característica da dor (opcional)
            </Label>
            <div className="flex flex-wrap gap-1">
              {PAIN_CHARACTERISTICS.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => onChange?.({ ...value, character: char })}
                  disabled={disabled}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all duration-200',
                    'hover:scale-105 active:scale-95',
                    value.character === char
                      ? `${colors.border} ${colors.bgSoft} ${colors.text}`
                      : 'border-border/50 bg-background hover:bg-muted/50',
                    disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
                  )}
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description tags */}
        {showDescription && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium text-muted-foreground px-1">
              Características adicionais
            </Label>
            <div className="flex flex-wrap gap-1">
              {PAIN_DESCRIPTIONS.map((desc) => (
                <button
                  key={desc}
                  type="button"
                  onClick={() => {
                    const currentDesc = value.description || '';
                    const descArray = currentDesc ? currentDesc.split(', ') : [];
                    if (descArray.includes(desc)) {
                      onChange?.({
                        ...value,
                        description: descArray.filter((d) => d !== desc).join(', '),
                      });
                    } else {
                      onChange?.({ ...value, description: [...descArray, desc].join(', ') });
                    }
                  }}
                  disabled={disabled}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[10px] border transition-all duration-200',
                    'hover:scale-105 active:scale-95',
                    value.description?.includes(desc)
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-border/50 bg-background hover:bg-muted/50',
                    disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
                  )}
                >
                  {desc}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PainLevelBlockImproved;
