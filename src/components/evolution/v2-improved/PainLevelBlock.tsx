/**
 * PainLevelBlock - Improved V2
 *
 * Enhanced pain level selector with better UX,
 * smooth animations, and professional visual design.
 */
import React, { useState } from 'react';
import { Smile, Meh, Frown, Angry } from 'lucide-react';
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
  { value: 10, label: 'Dor intensa', color: 'rose', icon: Angry },
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
      'relative transition-all duration-300 group',
      disabled && 'opacity-50'
    )}>
      {/* Removed Header for Panel as it's now handled by NotionSectionTitle */}

      <div className="px-2 pb-2 space-y-4">
        {/* Pain Value Display - Enhanced */}
        <div className="flex items-center gap-3">
          <div className={cn(
            'relative w-12 h-12 rounded-lg flex items-center justify-center',
            'transition-all duration-300',
            isAnimating && 'scale-105',
            colors.bg,
            'text-white'
          )}>
            <span className="text-xl font-bold">{painLevel}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CurrentIcon className={cn('h-4 w-4', colors.text)} />
              <p className={cn(
                'text-sm font-semibold',
                colors.text
              )}>
                {config.label}
              </p>
            </div>
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

        {/* Quick Presets - Enhanced Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {PAIN_LEVELS.map((preset) => {
            const Icon = preset.icon;
            const isActive = painLevel === preset.value;
            const isNearActive = Math.abs(painLevel - preset.value) <= 2;

            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePresetClick(preset.value)}
                disabled={disabled}
                className={cn(
                  'relative group flex flex-col items-center gap-1.5 py-2 px-2 rounded-lg transition-all duration-200',
                  'hover:bg-slate-50 active:scale-95',
                  isActive
                    ? 'bg-white ring-1 ring-slate-200 shadow-sm'
                    : isNearActive
                      ? 'bg-slate-50/50'
                      : 'bg-transparent',
                  disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
                )}
              >
                <Icon className={cn(
                  'h-4 w-4 transition-colors',
                  isActive ? 'text-white' : `text-${preset.color}-500`
                )} />
                <span className={cn(
                  'text-[10px] font-medium',
                  isActive ? colors.text : 'text-slate-500'
                )}>
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
                'w-full px-3 py-2 text-sm rounded-md border-transparent hover:bg-slate-50',
                'bg-transparent focus:outline-none focus:ring-1 focus:ring-slate-200 focus:bg-white focus:shadow-sm',
                'placeholder:text-slate-400 transition-all duration-200',
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
