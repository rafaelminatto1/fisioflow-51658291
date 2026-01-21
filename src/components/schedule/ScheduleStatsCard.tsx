import React from 'react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleStatsCardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  bgGradient: string;
  valueColor?: string;
  animationDelay?: string;
}

export const ScheduleStatsCard: React.FC<ScheduleStatsCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  bgGradient,
  valueColor,
  animationDelay = '0s'
}) => {
  return (
    <Card 
      className="group border-0 shadow-card hover:shadow-hover transition-all duration-300 overflow-hidden relative animate-bounce-in hover-lift min-h-[100px] sm:min-h-[120px]"
      style={{ animationDelay }}
    >
      <div className={cn("absolute inset-0", bgGradient)} />
      <CardContent className="p-3 sm:p-4 lg:p-6 relative h-full">
        <div className="flex flex-col gap-1.5 sm:gap-2 lg:gap-3 h-full">
          <div className="flex items-start justify-between gap-1">
            <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-muted-foreground leading-tight line-clamp-2">{title}</p>
            <div className={cn("p-1.5 sm:p-2 lg:p-2.5 rounded-lg group-hover:scale-110 transition-transform shrink-0", iconColor)}>
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-end">
            <div className={cn("text-xl sm:text-2xl lg:text-3xl font-bold", valueColor)}>{value}</div>
            <p className="text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
