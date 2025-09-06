import { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
  gradient?: boolean;
  onClick?: () => void;
  loading?: boolean;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon, 
  gradient = false,
  onClick,
  loading = false
}: MetricCardProps) {
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
        return 'text-secondary';
      case 'negative':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 bg-muted rounded w-24"></div>
          <div className="h-8 w-8 bg-muted rounded-lg"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded w-16 mb-1"></div>
          <div className="h-4 bg-muted rounded w-20"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "transition-all duration-300 hover:shadow-card cursor-pointer group",
        gradient && "bg-gradient-card",
        onClick && "hover:scale-105"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </h3>
        <div className={cn(
          "p-2 rounded-lg transition-all duration-200",
          gradient 
            ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground" 
            : "bg-accent text-accent-foreground"
        )}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
          {value}
        </div>
        {change !== undefined && (
          <div className={cn("text-xs flex items-center gap-1", getTrendColor())}>
            {getTrendIcon()}
            <span>
              {change > 0 ? '+' : ''}{change.toFixed(1)}% vs mês anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}