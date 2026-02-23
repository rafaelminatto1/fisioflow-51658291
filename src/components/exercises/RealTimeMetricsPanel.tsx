/**
 * RealTimeMetricsPanel - Painel de Métricas em Tempo Real
 *
 * Exibe métricas de execução de exercícios:
 * - Score de forma
 * - Contador de repetições
 * - Amplitude de movimento (ADM)
 * - Indicadores de qualidade
 * - Progresso visual
 * - Estatísticas da sessão
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  ExerciseMetrics,
  ExecutionQuality,
  getFormScoreColor,
} from '@/types/pose';
import {
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  Award,
  Zap,
  Flame,
  Target,
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

export interface RealTimeMetricsPanelProps {
  /** Métricas atuais */
  metrics: ExerciseMetrics;
  /** Número de repetições completadas */
  repetitions: number;
  /** Duração da sessão em segundos */
  duration: number;
  /** Objetivo de repetições (opcional) */
  targetRepetitions?: number;
  /** Objetivo de tempo em segundos (opcional) */
  targetDuration?: number;
  /** Mostrar score detalhado */
  showDetailedScore?: boolean;
  /** Modo compacto */
  compact?: boolean;
  /** Callback para ações */
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
}

/**
 * Obter cor baseada no score de forma
 */
function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-600 bg-emerald-50';
  if (score >= 70) return 'text-green-600 bg-green-50';
  if (score >= 50) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}

/**
 * Obter texto de qualidade
 */
function getQualityText(score: number): string {
  if (score >= 90) return 'Excelente';
  if (score >= 75) return 'Muito Bom';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Regular';
  return 'Precisa Melhorar';
}

/**
 * Obter ícone baseado na qualidade
 */
function getQualityIcon(score: number) {
  if (score >= 90) return <Award className="h-5 w-5" />;
  if (score >= 75) return <TrendingUp className="h-5 w-5" />;
  if (score >= 60) return <Activity className="h-5 w-5" />;
  return <TrendingDown className="h-5 w-5" />;
}

// ============================================================================
// COMPONENTES INTERNOS
// ============================================================================

/**
 * Componente de Gauge Circular para Score
 */
const ScoreGauge: React.FC<{ value: number; size?: number }> = ({ value, size = 120 }) => {
  const percentage = Math.max(0, Math.min(100, value));
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color = percentage >= 90 ? '#10b981' : percentage >= 70 ? '#22c55e' : percentage >= 50 ? '#eab308' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={12}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            'text-3xl font-bold',
            getScoreColor(percentage)
          )}
        >
          {Math.round(percentage)}
        </span>
      </div>
    </div>
  );
};

/**
 * Componente de Indicador de Progresso de Repetições
 */
const RepProgressIndicator: React.FC<{
  current: number;
  target: number;
}> = ({ current, target }) => {
  const percentage = target > 0 ? (current / target) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Progresso</span>
        <span className="font-bold">{current} / {target}</span>
      </div>
      <Progress value={percentage} className="h-2" />
      {percentage >= 100 && (
        <Badge className="bg-emerald-500 text-white mt-1">
          <Award className="h-3 w-3 mr-1" />
          Meta Atingida!
        </Badge>
      )}
    </div>
  );
};

/**
 * Componente de Card de Métrica Individual
 */
const MetricCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}> = ({ label, value, icon, trend, color }) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50',
      color && color
    )}>
      <div className={cn('p-2 rounded-full mb-2', color)}>
        {icon}
      </div>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
      {trend === 'up' && (
        <TrendingUp className="h-3 w-3 text-emerald-600 mt-1" />
      )}
      {trend === 'down' && (
        <TrendingDown className="h-3 w-3 text-red-600 mt-1" />
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const RealTimeMetricsPanel: React.FC<RealTimeMetricsPanelProps> = ({
  metrics,
  repetitions = 0,
  duration = 0,
  targetRepetitions,
  targetDuration,
  showDetailedScore = true,
  compact = false,
  onPause,
  onResume,
  onStop,
}) => {
  const { formScore, stabilityScore, rangeOfMotion, romPercentage, avgFps } = metrics;

  // Formatar duração
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcular qualidade
  const qualityText = getQualityText(formScore);
  const qualityIcon = getQualityIcon(formScore);
  const scoreColor = getScoreColor(formScore);

  // Modo compacto
  if (compact) {
    return (
      <div className="flex gap-3">
        {/* Score */}
        <div className={cn('flex items-center gap-2 p-2 rounded-lg', scoreColor)}>
          <Activity className="h-4 w-4" />
          <span className="font-bold">{Math.round(formScore)}</span>
        </div>

        {/* Repetições */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <Target className="h-4 w-4" />
          <span className="font-bold">{repetitions}</span>
        </div>

        {/* Duração */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <Clock className="h-4 w-4" />
          <span className="font-bold">{formatDuration(duration)}</span>
        </div>
      </div>
    );
  }

  // Modo completo
  return (
    <Card>
      <CardContent className="p-6">
        {/* Header com Score Principal */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-1">Qualidade da Execução</h3>
            <p className="text-sm text-muted-foreground">
              {qualityText}
            </p>
          </div>
          <ScoreGauge value={formScore} size={compact ? 80 : 140} />
        </div>

        {/* Botões de Controle */}
        <div className="flex gap-2">
          {onPause && (
            <button
              onClick={onPause}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
              aria-label="Pausar"
            >
              <Clock className="h-4 w-4" />
              Pausar
            </button>
          )}
          {onResume && (
            <button
              onClick={onResume}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              aria-label="Retomar"
            >
              <Activity className="h-4 w-4" />
              Continuar
            </button>
          )}
          {onStop && (
            <button
              onClick={onStop}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              aria-label="Parar"
            >
              <Zap className="h-4 w-4" />
              Finalizar
            </button>
          )}
        </div>

        {/* Métricas Detalhadas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Form Score */}
          <MetricCard
            label="Score de Forma"
            value={Math.round(formScore)}
            icon={qualityIcon}
            color={scoreColor}
          />

          {/* Estabilidade */}
          <MetricCard
            label="Estabilidade"
            value={Math.round(stabilityScore)}
            icon={<Activity className="h-5 w-5" />}
            trend={stabilityScore >= 80 ? 'up' : stabilityScore >= 60 ? 'neutral' : 'down'}
          />

          {/* Amplitude de Movimento */}
          <MetricCard
            label="ADM"
            value={`${Math.round(rangeOfMotion)}°`}
            icon={<Target className="h-5 w-5" />}
            trend={romPercentage >= 80 ? 'up' : romPercentage >= 50 ? 'neutral' : 'down'}
          />

          {/* % de ROM Atingido */}
          <MetricCard
            label="% Normal"
            value={`${Math.round(romPercentage)}%`}
            icon={<Award className="h-5 w-5" />}
            color={romPercentage >= 80 ? 'text-emerald-600 bg-emerald-50' : romPercentage >= 50 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'}
          />
        </div>

        {/* Progresso de Repetições */}
        {targetRepetitions && targetRepetitions > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-muted/30">
            <RepProgressIndicator
              current={repetitions}
              target={targetRepetitions}
            />
          </div>
        )}

        {/* Tempo e FPS (menor destaque) */}
        <div className="mt-4 flex justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tempo: <span className="font-semibold">{formatDuration(duration)}</span>
            {targetDuration && targetDuration > 0 && (
              <span className="text-muted-foreground">/ {formatDuration(targetDuration)}</span>
            )}
          </div>
          {avgFps > 0 && (
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              FPS: <span className="font-semibold">{avgFps.toFixed(0)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeMetricsPanel;
