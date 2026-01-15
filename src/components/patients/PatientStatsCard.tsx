import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatsCardProps {
  title?: string;
  value: number | string;
  subtitle: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'emerald' | 'blue' | 'gray' | 'orange' | 'red';
  className?: string;
  onClick?: () => void;
}

const colorClasses = {
  primary: {
    bg: 'bg-gradient-primary',
    text: 'text-primary-foreground',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
  },
  gray: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-500',
  },
  orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
  },
  red: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
  },
};

/**
 * Componente reutilizável para cards de estatísticas
 * Exibe um valor numérico com ícone, subtítulo e opcionalmente título
 */
export const PatientStatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  className,
  onClick,
}) => {
  const colors = colorClasses[color];
  const isClickable = !!onClick;

  return (
    <Card
      className={cn(
        'hover:shadow-lg transition-all duration-300',
        isClickable && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={title || subtitle}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {icon && (
            <div className={cn(
              'w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0',
              colors.bg,
              color === 'primary' && 'shadow-medical'
            )}>
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {title && (
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate mb-0.5">
                {title}
              </p>
            )}
            <p className="text-lg sm:text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {subtitle}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Skeleton loader para StatsCard
 */
export const PatientStatsCardSkeleton: React.FC<{ color?: StatsCardProps['color'] }> = ({ _color = 'primary' }) => {
  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-muted animate-pulse shrink-0" />
          <div className="min-w-0">
            <div className="h-6 bg-muted rounded animate-pulse w-20 mb-2" />
            <div className="h-4 bg-muted rounded animate-pulse w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
