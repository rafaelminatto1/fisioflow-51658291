/**
 * ProgressTrending - Displays progress trends with inline sparklines
 *
 * Features:
 * - Shows pain level trend over time
 * - Exercise difficulty trend
 * - Highlights improvements or concerns
 * - Mini sparkline in each relevant section
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

export interface DataPoint {
  date: Date;
  value: number;
  label?: string;
}

export interface TrendData {
  id: string;
  label: string;
  data: DataPoint[];
  trend: 'improving' | 'worsening' | 'stable';
  change: number; // Percentage change
  unit?: string;
}

export interface TrendingProps {
  data: TrendData;
  className?: string;
  showLabel?: boolean;
  showTrend?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// Calculate trend and change
const calculateTrend = (data: DataPoint[]): { trend: TrendData['trend']; change: number } => {
  if (data.length < 2) {
    return { trend: 'stable', change: 0 };
  }

  const first = data[0].value;
  const last = data[data.length - 1].value;
  const change = ((last - first) / first) * 100;

  // Determine trend based on change
  // For pain: lower is better (improving)
  // For other metrics: higher is usually better
  const context = data[0].label?.toLowerCase() || '';
  const isPainMetric = context.includes('dor') || context.includes('pain');

  let trend: TrendData['trend'] = 'stable';

  if (Math.abs(change) < 5) {
    trend = 'stable';
  } else if ((isPainMetric && change < 0) || (!isPainMetric && change > 0)) {
    trend = 'improving';
  } else {
    trend = 'worsening';
  }

  return { trend, change };
};

// Generate SVG path for sparkline
const generateSparklinePath = (
  data: DataPoint[],
  width: number,
  height: number,
  padding: number = 2
): string => {
  if (data.length === 0) return '';

  const xStep = (width - padding * 2) / Math.max(data.length - 1, 1);
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return data.map((point, index) => {
    const x = padding + index * xStep;
    const y = padding + height - padding - ((point.value - min) / range) * (height - padding * 2);
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
};

export const ProgressTrending: React.FC<TrendingProps> = ({
  data,
  className,
  showLabel = true,
  showTrend = true,
  size = 'medium',
}) => {
  const { trend, change } = useMemo(() => calculateTrend(data.data), [data.data]);

  const sizes = {
    small: { width: 80, height: 30 },
    medium: { width: 120, height: 40 },
    large: { width: 160, height: 50 },
  };

  const { width, height } = sizes[size];
  const path = generateSparklinePath(data.data, width, height);

  const trendConfig = useMemo(() => {
    switch (trend) {
      case 'improving':
        return {
          icon: <TrendingUp className="h-3 w-3" />,
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10',
          label: 'Melhorando',
        };
      case 'worsening':
        return {
          icon: <TrendingDown className="h-3 w-3" />,
          color: 'text-rose-500',
          bg: 'bg-rose-500/10',
          label: 'Piorando',
        };
      default:
        return {
          icon: <Minus className="h-3 w-3" />,
          color: 'text-muted-foreground',
          bg: 'bg-muted/50',
          label: 'Estável',
        };
    }
  }, [trend]);

  const isSignificantChange = Math.abs(change) >= 10;

  return (
    <div className={cn('progress-trending', 'inline-flex items-center gap-2', className)}>
      {/* Sparkline */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke={trend === 'improving' ? '#10b981' : trend === 'worsening' ? '#f43f5e' : '#64748b'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {data.data.map((point, index) => {
          const xStep = (width - 4) / Math.max(data.data.length - 1, 1);
          const values = data.data.map(d => d.value);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min || 1;
          const cx = 2 + index * xStep;
          const cy = 2 + height - 4 - ((point.value - min) / range) * (height - 8);

          return (
            <circle
              key={index}
              cx={cx}
              cy={cy}
              r={size === 'small' ? 2 : 2.5}
              fill={trend === 'improving' ? '#10b981' : trend === 'worsening' ? '#f43f5e' : '#64748b'}
              className={index === data.data.length - 1 ? 'r-3' : ''}
            />
          );
        })}
      </svg>

      {/* Trend indicator */}
      {showTrend && data.data.length >= 2 && (
        <div className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded-full',
          trendConfig.bg,
          trendConfig.color,
          'text-xs font-medium'
        )}>
          {trendConfig.icon}
          <span>{trendConfig.label}</span>
        </div>
      )}

      {/* Significant change indicator */}
      {isSignificantChange && showTrend && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          <span>{change > 0 ? '+' : ''}{Math.round(change)}%</span>
        </div>
      )}

      {/* Label */}
      {showLabel && data.data.length > 0 && (
        <span className="text-xs text-muted-foreground">
          {data.data.length} pts
        </span>
      )}
    </div>
  );
};

// Compact version for inline use
export interface CompactTrendProps {
  data: DataPoint[];
  className?: string;
  isPain?: boolean; // For pain: lower is better
}

export const CompactTrend: React.FC<CompactTrendProps> = ({ data, className, isPain = false }) => {
  if (data.length < 2) return null;

  const { trend, change } = calculateTrend(data);
  const path = generateSparklinePath(data, 60, 24);

  const strokeColor = trend === 'improving' ? '#10b981' : trend === 'worsening' ? '#f43f5e' : '#64748b';

  return (
    <div className={cn('compact-trend', 'inline-flex items-center gap-1.5', className)}>
      <svg
        width="60"
        height="24"
        viewBox="0 0 60 24"
        className="overflow-visible"
      >
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="56"
          cy={12 + (data[data.length - 1].value - data[0].value) * -0.5}
          r="2"
          fill={strokeColor}
        />
      </svg>
      <span className="text-[10px] text-muted-foreground">
        {change > 0 ? '+' : ''}{Math.round(change)}%
      </span>
    </div>
  );
};

// Hook to get trend data for a patient
export interface PatientTrendData {
  painLevels?: Array<{ date: Date; value: number }>;
  exerciseDifficulty?: Array<{ date: Date; value: number }>;
  measurements?: Array<{ type: string; date: Date; value: number }>;
}

export const useTrendData = (data: PatientTrendData): TrendData[] => {
  return useMemo(() => {
    const trends: TrendData[] = [];

    // Pain level trend
    if (data.painLevels && data.painLevels.length > 0) {
      const { trend, change } = calculateTrend(data.painLevels);
      trends.push({
        id: 'pain',
        label: 'Nível de Dor',
        data: data.painLevels,
        trend,
        change,
        unit: '0-10',
      });
    }

    // Exercise difficulty trend
    if (data.exerciseDifficulty && data.exerciseDifficulty.length > 0) {
      const { trend, change } = calculateTrend(data.exerciseDifficulty);
      trends.push({
        id: 'exercise',
        label: 'Dificuldade de Exercícios',
        data: data.exerciseDifficulty,
        trend,
        change,
        unit: '1-10',
      });
    }

    // Measurement trends (by type)
    if (data.measurements && data.measurements.length > 0) {
      const measurementsByType: Record<string, DataPoint[]> = {};

      data.measurements.forEach((m) => {
        if (!measurementsByType[m.type]) {
          measurementsByType[m.type] = [];
        }
        measurementsByType[m.type].push({
          date: m.date,
          value: m.value as number,
          label: m.type,
        });
      });

      Object.entries(measurementsByType).forEach(([type, points]) => {
        if (points.length > 1) {
          const { trend, change } = calculateTrend(points);
          trends.push({
            id: `measurement-${type}`,
            label: type.replace(/_/g, ' ').toUpperCase(),
            data: points,
            trend,
            change,
          });
        }
      });
    }

    return trends;
  }, [data]);
};
