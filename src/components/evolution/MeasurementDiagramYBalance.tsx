/**
 * MeasurementDiagramYBalance - Improved Version
 *
 * Enhanced Y-Balance Test diagram component with better UX/UI.
 * This component is designed to be used within the MeasurementForm.
 */
import React, { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { YBalanceKey, YBalanceValues } from '@/lib/evolution/yBalance';

interface MeasurementDiagramYBalanceProps {
  values: YBalanceValues;
  unit?: string;
  onChange: (key: YBalanceKey, value: string) => void;
  className?: string;
  /** Valor composto exibido (média das direções) */
  compositeLabel?: string;
  compositeValue?: number | null;
  notes?: string;
  onNotesChange?: (value: string) => void;
}

// Direction configurations with colors and labels
const DIRECTIONS: Array<{
  key: YBalanceKey;
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  position: { x: number; y: number };
}> = [
  {
    key: 'anterior',
    label: 'Anterior',
    shortLabel: 'ANT',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    focusRing: 'focus-within:ring-emerald-100',
  },
  {
    key: 'posteromedial',
    label: 'Posteromedial',
    shortLabel: 'PM',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    focusRing: 'focus-within:ring-violet-100',
  },
  {
    key: 'posterolateral',
    label: 'Posterolateral',
    shortLabel: 'PL',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    focusRing: 'focus-within:ring-amber-100',
  },
];

/** Esquema em Y do Y Balance Test (Lower Quarter): anterior, posteromedial, posterolateral. */
export function MeasurementDiagramYBalance({
  values,
  unit = 'cm',
  onChange,
  className,
  compositeLabel = 'Composto',
  compositeValue,
  notes,
  onNotesChange,
}: MeasurementDiagramYBalanceProps) {
  const [hoveredDirection, setHoveredDirection] = useState<YBalanceKey | null>(null);

  // Calculate composite score if not provided
  const calculatedComposite = useMemo(() => {
    if (compositeValue !== undefined) return compositeValue;
    const nums = Object.values(values).map(v => parseFloat(v)).filter(n => !Number.isNaN(n));
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }, [values, compositeValue]);

  const hasAllValues = Object.values(values).every(v => v !== '' && v != null);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* SVG: Y com três direções - Enhanced */}
        <div className="relative flex-shrink-0 w-full max-w-[280px] aspect-square">
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
              className="text-slate-200"
            />

            {/* Direction paths */}
            {DIRECTIONS.map((dir) => {
              const value = parseFloat(values[dir.key]) || 0;
              const maxValue = 100;
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
                    stroke={isHovered ? `currentColor` : 'currentColor'}
                    strokeWidth={isHovered ? 4 : 2}
                    strokeLinecap="round"
                    className={cn(
                      'transition-all duration-300',
                      isHovered ? dir.color : 'text-slate-300'
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

                  {/* Direction circle */}
                  <circle
                    cx={dir.position.x * 2}
                    cy={dir.position.y * 2}
                    r={isHovered ? 14 : 12}
                    className={cn(
                      'transition-all duration-200',
                      isHovered ? dir.bg : 'bg-white',
                      dir.border
                    )}
                    fill={isHovered ? dir.bg : 'white'}
                    stroke={isHovered ? dir.color : 'currentColor'}
                    strokeWidth={2}
                  />

                  {/* Direction label */}
                  <text
                    x={dir.position.x * 2}
                    y={dir.position.y * 2}
                    textAnchor="middle"
                    dy="4"
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider pointer-events-none',
                      isHovered ? dir.color : 'text-slate-500'
                    )}
                    style={{
                      fill: isHovered ? undefined : 'currentColor',
                    }}
                  >
                    {dir.shortLabel}
                  </text>
                </g>
              );
            })}

            {/* Center pivot (stance foot) */}
            <circle cx="100" cy="100" r="18" fill="currentColor" className="text-slate-100" opacity={1} />
            <circle cx="100" cy="100" r="12" fill="currentColor" className="text-slate-200" opacity={1} />
            <circle cx="100" cy="100" r="6" fill="currentColor" className="text-slate-400" />

            {/* Center label */}
            <text
              x="100"
              y="104"
              textAnchor="middle"
              className="text-[8px] font-semibold text-slate-600 uppercase tracking-widest pointer-events-none"
            >
              APOIO
            </text>
          </svg>

          {/* Value indicators overlay */}
          {DIRECTIONS.map((dir) => {
            const value = values[dir.key];
            const hasValue = value !== '' && value != null;

            return (
              hasValue && (
                <div
                  key={dir.key}
                  className={cn(
                    'absolute flex items-center justify-center w-10 h-10 rounded-xl shadow-md transition-all duration-200',
                    'bg-gradient-to-br from-white to-slate-50',
                    dir.border
                  )}
                  style={{
                    left: `${dir.position.x}%`,
                    top: `${dir.position.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <span className={cn('text-xs font-bold', dir.color)}>{value}</span>
                </div>
              )
            );
          })}
        </div>

        {/* Inputs ao lado de cada direção - Enhanced Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full">
          {DIRECTIONS.map((dir) => {
            const value = values[dir.key];
            const hasValue = value !== '' && value != null;

            return (
              <div
                key={dir.key}
                className={cn(
                  'space-y-2 p-4 rounded-xl border transition-all duration-200',
                  'hover:shadow-md',
                  dir.bg,
                  dir.border,
                  hoveredDirection === dir.key && 'ring-2 ring-offset-1'
                )}
                onMouseEnter={() => setHoveredDirection(dir.key)}
                onMouseLeave={() => setHoveredDirection(null)}
              >
                <Label className={cn(
                  'text-[10px] font-bold uppercase tracking-wider flex items-center justify-between',
                  dir.color
                )}>
                  <span>{dir.shortLabel}</span>
                  {hasValue && (
                    <div className={cn('w-1.5 h-1.5 rounded-full', dir.color.replace('text-', 'bg-'))} />
                  )}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={value}
                    onChange={(e) => onChange(dir.key, e.target.value)}
                    placeholder="0"
                    className={cn(
                      'h-12 bg-white border-slate-200 font-bold text-lg text-center',
                      'focus:ring-2 focus:ring-offset-1 transition-all',
                      dir.focusRing
                    )}
                    aria-label={`${dir.label} (${unit})`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    {unit}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground text-center font-medium">
                  {dir.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Composite score - Enhanced */}
      {(calculatedComposite || compositeValue) && !Number.isNaN(calculatedComposite ?? 0) && (
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
            {(calculatedComposite ?? compositeValue)?.toFixed(1)} {unit}
          </span>
        </div>
      )}

      {/* Asymmetry indicator */}
      {hasAllValues && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>
            Assimetria PM-PL:{' '}
            <span className="font-semibold">
              {Math.abs(
                (parseFloat(values.posteromedial) || 0) - (parseFloat(values.posterolateral) || 0)
              ).toFixed(1)} {unit}
            </span>
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
          />
        </div>
      )}
    </div>
  );
}
