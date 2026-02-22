/**
 * PainLevelBlock - Improved V2
 *
 * Enhanced pain level selector with better UX,
 * smooth animations, and professional visual design.
 */
import React, { useState } from 'react';
import { Activity, Smile, Meh, Frown, HeartCrack } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PainLevelBlockProps {
  painLevel?: number;
  painLocation?: string;
  onPainLevelChange: (level: number) => void;
  onPainLocationChange: (location: string) => void;
  disabled?: boolean;
}

// Pain level configurations with colors and icons
const PAIN_LEVELS = [
  { value: 0, label: 'Sem dor', color: 'emerald', icon: Smile },
  { value: 3, label: 'Dor leve', color: 'lime', icon: Meh },
  { value: 6, label: 'Dor moderada', color: 'amber', icon: Frown },
  { value: 10, label: 'Dor intensa', color: 'rose', icon: HeartCrack },
];

const getPainConfig = (level: number) => {
  if (level === 0) return PAIN_LEVELS[0];
  if (level <= 3) return PAIN_LEVELS[1];
  if (level <= 6) return PAIN_LEVELS[2];
  return PAIN_LEVELS[3];
};

const getPainColor = (level: number): { bg: string; text: string; border: string; gradient: string } => {
  if (level === 0) return {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600',
    border: 'border-emerald-500',
    gradient: 'from-emerald-400 to-emerald-600'
  };
  if (level <= 3) return {
    bg: 'bg-lime-500',
    text: 'text-lime-600',
    border: 'border-lime-500',
    gradient: 'from-lime-400 to-lime-600'
  };
  if (level <= 6) return {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    border: 'border-amber-500',
    gradient: 'from-amber-400 to-amber-600'
  };
  return {
    bg: 'bg-rose-500',
    text: 'text-rose-600',
    border: 'border-rose-500',
    gradient: 'from-rose-400 to-rose-600'
  };
};

export const PainLevelBlock: React.FC<PainLevelBlockProps> = ({
  painLevel = 0,
  painLocation = '',
  onPainLevelChange,
  onPainLocationChange,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const config = getPainConfig(painLevel);
  const colors = getPainColor(painLevel);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    onPainLevelChange(value);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handlePresetClick = (value: number) => {
    onPainLevelChange(value);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const CurrentIcon = config.icon;

  return (
    <div className={cn(
      'rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300',
      'shadow-sm hover:shadow-md',
      disabled && 'opacity-50'
    )}>
      {/* Header with gradient accent */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500/60 via-rose-500 to-rose-500/60" />
        <div className="flex items-center gap-2.5 p-3.5 border-b border-border/40 bg-gradient-to-r from-rose-500/5 to-transparent">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20">
            <Activity className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-xs font-semibold text-foreground">Nível de Dor</h3>
            <span className="text-[10px] text-muted-foreground">Escala Visual Analógica (EVA)</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Pain Value Display - Enhanced */}
        <div className="flex items-center gap-3">
          <div className={cn(
            'relative w-16 h-16 rounded-2xl flex items-center justify-center',
            'transition-all duration-300 shadow-lg',
            isAnimating && 'scale-110',
            `bg-gradient-to-br ${colors.gradient}`
          )}>
            {/* Animated glow effect */}
            {isAnimating && (
              <div className={cn(
                'absolute inset-0 rounded-2xl animate-ping',
                colors.bg
              )} style={{ opacity: 0.3 }} />
            )}
            <span className="text-2xl font-bold text-white drop-shadow-sm">{painLevel}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CurrentIcon className={cn('h-4 w-4', colors.text)} />
              <p className={cn(
                'text-base font-semibold',
                colors.text
              )}>
                {config.label}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Escala de 0 a 10</p>
          </div>
        </div>

        {/* Enhanced Slider with Visual Scale */}
        <div className="space-y-2">
          {/* Visual scale indicators */}
          <div className="relative h-3 bg-gradient-to-r from-emerald-500 via-lime-500 via-amber-500 to-rose-500 rounded-full shadow-inner">
            <input
              type="range"
              min="0"
              max="10"
              value={painLevel}
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
            {/* Thumb */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-white shadow-lg transition-all duration-100',
                isDragging && 'scale-125 shadow-xl',
                colors.border
              )}
              style={{ left: `calc(${(painLevel / 10) * 100}% - 8px)` }}
            >
              {/* Inner dot */}
              <div className={cn('absolute inset-1 rounded-full', colors.bg)} />
            </div>
          </div>
          {/* Scale labels */}
          <div className="flex justify-between text-[10px] text-muted-foreground px-1 font-medium">
            <span>Sem dor</span>
            <span>Moderada</span>
            <span>Máxima</span>
          </div>
        </div>

        {/* Number Buttons 1-10 */}
        <div className="pt-2 space-y-2">
          <label className="block text-[11px] font-medium text-muted-foreground px-1 flex items-center gap-1.5">
            <span>Selecione o nível de dor</span>
            <span className="text-[9px] text-muted-foreground/60">(clique para selecionar)</span>
          </label>
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
              const isActive = painLevel === num;
              const numColors = getPainColor(num);

              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePresetClick(num)}
                  disabled={disabled}
                  className={cn(
                    'relative group h-11 rounded-lg border font-semibold text-sm',
                    'transition-all duration-200 ease-out',
                    'hover:scale-105 hover:-translate-y-0.5',
                    'active:scale-95 active:translate-y-0',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                    isActive
                      ? `${numColors.border} bg-gradient-to-br ${numColors.gradient} shadow-lg shadow-${numColors.text.split('-')[1]}-500/20 text-white`
                      : 'border-border/60 bg-muted/40 hover:bg-muted/60 hover:border-border text-muted-foreground hover:text-foreground',
                    disabled && 'opacity-50 cursor-not-allowed hover:scale-100 hover:translate-y-0'
                  )}
                  style={isActive ? {
                    boxShadow: `0 4px 12px -2px ${numColors.text.includes('emerald') ? '#10b981' : numColors.text.includes('lime') ? '#84cc16' : numColors.text.includes('amber') ? '#f59e0b' : '#f43f5e'}40`
                  } : undefined}
                >
                  {num}
                  {/* Hover glow effect */}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  )}
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1 rounded-full bg-white shadow-sm" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pain Location Input - Enhanced */}
        <div className="pt-1">
          <label className="block text-[10px] font-medium text-muted-foreground mb-1.5 px-1">
            Localização da dor (opcional)
          </label>
          <div className="relative">
            <input
              type="text"
              value={painLocation}
              onChange={(e) => onPainLocationChange(e.target.value)}
              disabled={disabled}
              placeholder="Ex: Ombro direito, região anterior"
              className={cn(
                'w-full px-3.5 py-2.5 text-sm rounded-xl border border-input',
                'bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring',
                'placeholder:text-muted-foreground/50 transition-all duration-200',
                'hover:border-border/80',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            />
            {painLocation && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
