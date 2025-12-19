import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp } from 'lucide-react';
import { differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';

interface TreatmentDurationCardProps {
  firstSessionDate: Date;
  className?: string;
}

export const TreatmentDurationCard: React.FC<TreatmentDurationCardProps> = ({
  firstSessionDate,
  className,
}) => {
  const now = new Date();
  const days = differenceInDays(now, firstSessionDate);
  const weeks = differenceInWeeks(now, firstSessionDate);
  const months = differenceInMonths(now, firstSessionDate);

  const formatDuration = () => {
    if (months > 0) {
      const remainingWeeks = weeks - months * 4;
      if (remainingWeeks > 0) {
        return `${months} ${months === 1 ? 'mês' : 'meses'} e ${remainingWeeks} ${remainingWeeks === 1 ? 'semana' : 'semanas'}`;
      }
      return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    }
    if (weeks > 0) {
      const remainingDays = days - weeks * 7;
      if (remainingDays > 0) {
        return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} e ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`;
      }
      return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
    }
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  };

  const getPhaseColor = () => {
    if (days <= 14) return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    if (days <= 30) return 'bg-green-500/10 text-green-600 border-green-500/30';
    if (days <= 90) return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
  };

  const getPhaseLabel = () => {
    if (days <= 14) return 'Início';
    if (days <= 30) return 'Adaptação';
    if (days <= 90) return 'Evolução';
    return 'Manutenção';
  };

  return (
    <div className={`p-3 rounded-lg border ${getPhaseColor()} ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 text-xs opacity-80">
          <Clock className="h-3 w-3" />
          Tempo de Tratamento
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {getPhaseLabel()}
        </Badge>
      </div>
      <p className="font-semibold text-sm">{formatDuration()}</p>
      <div className="flex items-center gap-1 mt-1 text-[10px] opacity-70">
        <Calendar className="h-3 w-3" />
        Desde {firstSessionDate.toLocaleDateString('pt-BR')}
      </div>
    </div>
  );
};
