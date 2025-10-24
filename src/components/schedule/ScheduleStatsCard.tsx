import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
      className="group border-0 shadow-card hover:shadow-hover transition-all duration-300 overflow-hidden relative animate-bounce-in hover-lift"
      style={{ animationDelay }}
    >
      <div className={cn("absolute inset-0", bgGradient)} />
      <CardContent className="p-4 sm:p-6 relative">
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
            <div className={cn("p-2 sm:p-2.5 rounded-lg group-hover:scale-110 transition-transform", iconColor)}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div>
            <div className={cn("text-2xl sm:text-3xl font-bold", valueColor)}>{value}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
