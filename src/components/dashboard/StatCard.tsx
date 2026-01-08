import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ReactNode } from 'react';

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

export function StatCard({
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
        "border-border/50 transition-all duration-300 hover:shadow-medical cursor-pointer group overflow-hidden relative min-h-[120px]",
        gradient ? "bg-gradient-card" : "bg-card/80 backdrop-blur-sm",
        onClick && "hover:scale-[1.02] hover:-translate-y-1"
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardContent className="p-4 sm:p-5 relative h-full">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-primary/10 group-hover:bg-gradient-primary/20 transition-colors shrink-0">
              {icon}
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight flex-1">{title}</p>
          </div>
          <div className="flex-1 flex flex-col justify-end">
            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground">{value}</h3>
            </div>
            {change && (
              <div className={cn("flex items-center gap-1 text-xs sm:text-sm font-medium flex-wrap", getTrendColor())}>
                {getTrendIcon()}
                <span>{change}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}