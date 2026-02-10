/**
 * YBalanceBlock - Improved V2
 *
 * Enhanced Y-Balance Test component with better UX,
 * professional visual design, and proper layout.
 */
import React, { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { YBalanceKey, YBalanceValues } from '@/lib/evolution/yBalance';

interface YBalanceBlockProps {
  values: YBalanceValues;
  unit?: string;
  onChange: (key: YBalanceKey, value: string) => void;
  notes?: string;
  onNotesChange?: (value: string) => void;
  className?: string;
  compositeLabel?: string;
  readOnly?: boolean;
}

// Direction configurations with colors and labels
const DIRECTIONS: Array<{
  key: YBalanceKey;
  label: string;
  shortLabel: string;
  color: string;
  gradient: string;
  bg: string;
  position: { x: number; y: number };
}> = [
  {
    key: 'anterior',
    label: 'Anterior',
    shortLabel: 'ANT',
    color: 'text-emerald-600',
    gradient: 'from-emerald-400 to-emerald-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    position: { x: 50, y: 15 },
  },
  {
    key: 'posteromedial',
    label: 'Posteromedial',
    shortLabel: 'PM',
    color: 'text-violet-600',
    gradient: 'from-violet-400 to-violet-500',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    position: { x: 22, y: 78 },
  },
  {
    key: 'posterolateral',
    label: 'Posterolateral',
    shortLabel: 'PL',
    color: 'text-amber-600',
    gradient: 'from-amber-400 to-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    position: { x: 78, y: 78 },
  },
];

export const YBalanceBlock: React.FC<YBalanceBlockProps> = ({
  values,
  unit = 'cm',
  onChange,
  notes,
  onNotesChange,
  className,
  compositeLabel = 'Composto',
  readOnly = false,
}) => {
  const [hoveredDirection, setHoveredDirection] = useState<YBalanceKey | null>(null);

  // Calculate composite score
  const compositeScore = useMemo(() => {
    const nums = Object.values(values).map(v => parseFloat(v)).filter(n => !Number.isNaN(n));
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }, [values]);

  // Calculate limb symmetry if both sides were measured (optional enhancement)
  const hasAllValues = Object.values(values).every(v => v !== '' && v != null);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Y-Balance Diagram */}
      <div className="relative w-full max-w-[320px] mx-auto aspect-square">
        {/* SVG Diagram */}
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full"
          aria-label="Y-Balance Test diagram showing three reach directions"
        >
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-border/30"
          />

          {/* Direction paths with gradient fills based on values */}
          {DIRECTIONS.map((dir) => {
            const value = parseFloat(values[dir.key]) || 0;
            const maxValue = 100; // assumed max reach
            const reachPercent = Math.min(value / maxValue, 1);
            const isHovered = hoveredDirection === dir.key;

            return (
              <g key={dir.key}>
                {/* Direction line */}
                <line
                  x1="100"
                  y1="100"
                  x2={dir.position.x * 2}
                  y2={dir.position.y * 2}
                  stroke={isHovered ? `url(#gradient-${dir.key})` : 'currentColor'}
                  strokeWidth={isHovered ? 4 : 2}
                  strokeLinecap="round"
                  className={cn(
                    'transition-all duration-300',
                    dir.color.replace('text-', 'text-').replace('-600', '/40')
                  )}
                  onMouseEnter={() => setHoveredDirection(dir.key)}
                  onMouseLeave={() => setHoveredDirection(null)}
                />

                {/* Reach indicator (filled portion based on value) */}
                {value > 0 && (
                  <line
                    x1="100"
                    y1="100"
                    x2={100 + (dir.position.x - 100) * reachPercent * 1.7}
                    y2={100 + (dir.position.y - 100) * reachPercent * 1.7}
                    className={cn('transition-all duration-500', dir.color)}
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                )}

                {/* Direction label circle */}
                <circle
                  cx={dir.position.x * 2}
                  cy={dir.position.y * 2}
                  r={isHovered ? 14 : 12}
                  className={cn(
                    'transition-all duration-200',
                    isHovered ? dir.bg : 'bg-background',
                    dir.border
                  )}
                  fill={isHovered ? undefined : 'currentColor'}
                  fillOpacity={isHovered ? 1 : 0.1}
                  stroke={isHovered ? undefined : 'currentColor'}
                  strokeWidth={isHovered ? 0 : 2}
                />
              </g>
            );
          })}

          {/* Center pivot (stance foot) */}
          <circle cx="100" cy="100" r="18" fill="currentColor" className="text-slate-700" opacity={0.15} />
          <circle cx="100" cy="100" r="12" fill="currentColor" className="text-slate-700" opacity={0.3} />
          <circle cx="100" cy="100" r="6" fill="currentColor" className="text-slate-700" />

          {/* Gradients */}
          <defs>
            {DIRECTIONS.map((dir) => (
              <linearGradient key={dir.key} id={`gradient-${dir.key}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className={cn(dir.color.replace('text-', 'text-').replace('-600', '-400'))} />
                <stop offset="100%" className={cn(dir.color.replace('text-', 'text-').replace('-600', '-500'))} />
              </linearGradient>
            ))}
          </defs>
        </svg>

        {/* Direction labels overlay */}
        {DIRECTIONS.map((dir) => {
          const value = values[dir.key];
          const hasValue = value !== '' && value != null;

          return (
            <div
              key={dir.key}
              className={cn(
                'absolute flex flex-col items-center gap-1 transition-all duration-200',
                'hover:scale-110',
                dir.color
              )}
              style={{
                left: `${dir.position.x}%`,
                top: `${dir.position.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseEnter={() => setHoveredDirection(dir.key)}
              onMouseLeave={() => setHoveredDirection(null)}
            >
              {/* Short label */}
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                {dir.shortLabel}
              </span>

              {/* Value indicator */}
              {hasValue && (
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shadow-md',
                  'bg-gradient-to-br',
                  dir.gradient
                )}>
                  <span className="text-xs font-bold text-white">{value}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Center label */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-8">
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">
            Apoio
          </span>
        </div>
      </div>

      {/* Input cards */}
      <div className="grid grid-cols-3 gap-3">
        {DIRECTIONS.map((dir) => {
          const value = values[dir.key];
          const hasValue = value !== '' && value != null;

          return (
            <div
              key={dir.key}
              className={cn(
                'space-y-2 p-3 rounded-xl border transition-all duration-200',
                'hover:shadow-md',
                dir.bg,
                dir.border,
                hoveredDirection === dir.key && 'ring-2 ring-offset-1'
              )}
              onMouseEnter={() => setHoveredDirection(dir.key)}
              onMouseLeave={() => setHoveredDirection(null)}
            >
              <Label className={cn(
                'text-[10px] font-bold uppercase tracking-wider flex items-center gap-1',
                dir.color
              )}>
                {dir.shortLabel}
                {hasValue && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-current opacity-60" />
                )}
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={value}
                  onChange={(e) => onChange(dir.key, e.target.value)}
                  placeholder="0"
                  readOnly={readOnly}
                  className={cn(
                    'h-12 bg-white font-bold text-lg text-center',
                    'focus:ring-2 focus:ring-offset-1 transition-all',
                    dir.color.replace('text-', 'focus:ring-'),
                    readOnly && 'cursor-default'
                  )}
                />
                <span className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold',
                  'text-muted-foreground'
                )}>
                  {unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composite score */}
      {compositeScore && !Number.isNaN(compositeScore) && (
        <div className={cn(
          'flex items-center justify-center gap-3 p-4 rounded-xl border',
          'bg-gradient-to-r from-slate-50 to-slate-100/50',
          'border-slate-200'
        )}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {compositeLabel}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <span className="text-lg font-bold text-slate-800">
            {compositeScore.toFixed(1)} {unit}
          </span>
        </div>
      )}

      {/* Asymmetry indicator (if all values are present) */}
      {hasAllValues && (
        <div className="flex items-center justify-center gap-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Asymetria: {Math.abs(
              (parseFloat(values.posteromedial) || 0) - (parseFloat(values.posterolateral) || 0)
            ).toFixed(1)} {unit}
          </span>
        </div>
      )}

      {/* Notes section */}
      {onNotesChange && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            Anotações
            <span className="text-muted-foreground/60 font-normal lowercase">(opcional)</span>
          </Label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Observações sobre o Y-Balance Test: condições, dor registrada, comparações..."
            className={cn(
              'w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background',
              'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring',
              'placeholder:text-muted-foreground/50 min-h-[70px] resize-y'
            )}
            rows={2}
            readOnly={readOnly}
          />
        </div>
      )}
    </div>
  );
};
