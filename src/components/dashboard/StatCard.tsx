import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ReactNode, memo } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  gradient?: boolean;
  onClick?: () => void;
  loading?: boolean;
}

export const StatCard = memo(function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  gradient = false,
  onClick,
  loading = false
}: StatCardProps) {
  const getTrendIcon = () => {
    switch (changeType) {
      case 'positive':
        return <TrendingUp className="w-3 h-3" />;
      case 'negative':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  const getTrendColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border min-h-[120px]">
        <CardContent className="p-4 sm:p-5">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-border/40 transition-all duration-500 hover:shadow-premium-lg cursor-pointer group overflow-hidden relative min-h-[120px] ring-offset-background",
        gradient ? "bg-gradient-card" : "bg-card/40 backdrop-blur-md",
        onClick && "hover:scale-[1.01] hover:-translate-y-1 active:scale-[0.98]"
      )}
      onClick={onClick}
    >
      {/* Dynamic Background Pattern */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 bg-secondary/5 rounded-full blur-xl group-hover:bg-secondary/10 transition-colors duration-500" />
      
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardContent className="p-4 sm:p-5 relative h-full z-10">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-border/50 group-hover:border-primary/50 group-hover:shadow-primary/10 transition-all duration-500 shrink-0">
              <div className="text-primary group-hover:scale-110 transition-transform duration-500">
                {icon}
              </div>
            </div>
            <p className="text-xs sm:text-sm font-bold text-muted-foreground group-hover:text-foreground uppercase tracking-wider transition-colors leading-tight flex-1">
              {title}
            </p>
          </div>
          
          <div className="flex-1 flex flex-col justify-end">
            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight group-hover:tracking-normal transition-all duration-500">
                {value}
              </h3>
            </div>
            {change && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs sm:text-sm font-bold px-2 py-0.5 rounded-full w-fit bg-slate-100/50 dark:bg-slate-800/50 border border-border/40", 
                getTrendColor()
              )}>
                {getTrendIcon()}
                <span>{change}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
