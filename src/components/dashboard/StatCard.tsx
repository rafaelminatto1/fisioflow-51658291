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
      <Card className="bg-gradient-card border-border">
        <CardContent className="p-6">
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
        "border-border transition-all duration-200 hover:shadow-lg cursor-pointer",
        gradient ? "bg-gradient-card" : "bg-card",
        onClick && "hover:scale-105"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {icon}
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-foreground">{value}</h3>
            </div>
            {change && (
              <div className={cn("flex items-center gap-1 mt-2 text-xs", getTrendColor())}>
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