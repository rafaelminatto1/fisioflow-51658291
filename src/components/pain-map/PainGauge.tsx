import { cn } from '@/lib/utils';

interface PainGaugeProps {
  score: number; // Score total de 0 a 100
  intensity?: number; // Intensidade média de 0 a 10 (opcional)
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// Função para obter cor baseada na intensidade
const getIntensityColor = (score: number): string => {
  if (score <= 20) return '#22c55e'; // Verde - leve
  if (score <= 40) return '#eab308'; // Amarelo - moderada
  if (score <= 60) return '#f97316'; // Laranja - moderada-alta
  if (score <= 80) return '#ef4444'; // Vermelho - alta
  return '#7f1d1d'; // Vermelho escuro - severa
};

// Função para obter label baseado no score
const getScoreLabel = (score: number): string => {
  if (score === 0) return 'Sem Dor';
  if (score <= 20) return 'Leve';
  if (score <= 40) return 'Moderada';
  if (score <= 60) return 'Alta';
  if (score <= 80) return 'Severa';
  return 'Extrema';
};

export function PainGauge({
  score,
  intensity,
  className,
  size = 'md',
  showLabel = true
}: PainGaugeProps) {
  // Normalizar score para 0-100
  const normalizedScore = Math.min(100, Math.max(0, score));

  // Calcular rotação do gauge (0 a 180 graus, onde 0 = 0% e 180 = 100%)
  const rotation = (normalizedScore / 100) * 180;

  const color = getIntensityColor(normalizedScore);

  const sizeClasses = {
    sm: 'w-24 h-12',
    md: 'w-32 h-16',
    lg: 'w-40 h-20'
  };

  const textSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl'
  };

  return (
    <div className={cn('relative flex flex-col items-center w-full', className)}>
      {/* Gauge Container */}
      <div className={cn('relative', sizeClasses[size])}>
        {/* Background Arc */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 100"
          preserveAspectRatio="none"
        >
          {/* Background semicircle */}
          <path
            d="M 10 90 A 90 90 0 0 1 190 90"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
            strokeLinecap="round"
            className="opacity-20"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="25%" stopColor="#eab308" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
          </defs>

          {/* Progress Arc */}
          {normalizedScore > 0 && (
            <path
              d="M 10 90 A 90 90 0 0 1 190 90"
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(normalizedScore / 100) * 282.74} 282.74`}
              className="transition-all duration-500 ease-out"
              style={{
                // strokeDashoffset removed to fix alignment
              }}
            />
          )}
        </svg>

        {/* Needle Indicator */}
        <div
          className="absolute bottom-0 left-1/2 w-1 h-full origin-bottom -translate-x-1/2 transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-50%) rotate(${rotation - 90}deg)` }}
        >
          <div
            className="absolute top-2 left-1/2 w-0 h-0 -translate-x-1/2"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: `${size === 'sm' ? '12px' : size === 'md' ? '16px' : '20px'} solid ${color}`,
            }}
          />
        </div>
      </div>

      {/* Score Display */}
      <div className="flex flex-col items-center mt-2">
        <div className={cn('font-bold text-foreground', textSizes[size])}>
          {intensity !== undefined ? intensity : Math.round(normalizedScore / 10)}
        </div>
        {showLabel && (
          <>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
              {intensity !== undefined ? '/10' : 'Score Total'}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {getScoreLabel(normalizedScore)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

