import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  TrendingUp, 
  Lightbulb, 
  Clock,
  X,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type InsightType = 'alert' | 'opportunity' | 'recommendation' | 'trend';
export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';

interface InsightCardProps {
  type: InsightType;
  priority: InsightPriority;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  timestamp?: Date;
  metadata?: Record<string, string | number>;
}

const INSIGHT_CONFIG = {
  alert: {
    icon: AlertTriangle,
    color: 'destructive',
    bgColor: 'bg-destructive/5 border-destructive/20'
  },
  opportunity: {
    icon: TrendingUp,
    color: 'secondary',
    bgColor: 'bg-secondary/5 border-secondary/20'
  },
  recommendation: {
    icon: Lightbulb,
    color: 'primary',
    bgColor: 'bg-primary/5 border-primary/20'
  },
  trend: {
    icon: Clock,
    color: 'muted',
    bgColor: 'bg-muted/20 border-border'
  }
} as const;

const PRIORITY_CONFIG = {
  low: { label: 'Baixa', variant: 'outline' as const },
  medium: { label: 'Média', variant: 'secondary' as const },
  high: { label: 'Alta', variant: 'default' as const },
  critical: { label: 'Crítica', variant: 'destructive' as const }
};

export function InsightCard({
  type,
  priority,
  title,
  message,
  action,
  onDismiss,
  timestamp,
  metadata
}: InsightCardProps) {
  const config = INSIGHT_CONFIG[type];
  const priorityConfig = PRIORITY_CONFIG[priority];
  const Icon = config.icon;

  return (
    <Card className={cn(
      "relative transition-all duration-200 hover:shadow-md",
      config.bgColor,
      "animate-slide-in"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              `bg-${config.color}/10 text-${config.color}`
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-foreground">
                  {title}
                </h3>
                <Badge variant={priorityConfig.variant} className="text-xs">
                  {priorityConfig.label}
                </Badge>
              </div>
              {timestamp && (
                <p className="text-xs text-muted-foreground">
                  {timestamp.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          </div>
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-50 hover:opacity-100"
              onClick={onDismiss}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {message}
        </p>
        
        {metadata && (
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground capitalize">{key}:</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
        
        {action && (
          <Button
            size="sm"
            variant={config.color === 'destructive' ? 'destructive' : 'default'}
            onClick={action.onClick}
            className="gap-2"
          >
            {action.label}
            <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Automated insight generation
export function generateInsights(data: {
  revenue?: Array<{ value: number }>;
  occupancyRate?: number;
  noShowRate?: number;
}): InsightCardProps[] {
  const insights: InsightCardProps[] = [];
  
  // Revenue trend analysis
  if (data?.revenue && data.revenue.length > 1) {
    const current = data.revenue[data.revenue.length - 1]?.value || 0;
    const previous = data.revenue[data.revenue.length - 2]?.value || 0;
    const change = ((current - previous) / previous) * 100;
    
    if (change < -10) {
      insights.push({
        type: 'alert',
        priority: 'high',
        title: 'Queda no Faturamento',
        message: `Faturamento caiu ${Math.abs(change).toFixed(1)}% em relação ao mês anterior. Recomendamos revisar estratégias de retenção.`,
        timestamp: new Date(),
        metadata: {
          'Variação': `${change.toFixed(1)}%`,
          'Valor Atual': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(current)
        },
        action: {
          label: 'Ver Detalhes Financeiros',
          onClick: () => console.log('Navigate to financial details')
        }
      });
    }
  }
  
  // Appointment analysis  
  if (data?.occupancyRate !== undefined) {
    if (data.occupancyRate < 70) {
      insights.push({
        type: 'opportunity',
        priority: 'medium',
        title: 'Oportunidade de Otimização',
        message: `Taxa de ocupação está em ${data.occupancyRate}%. Considere campanhas para aumentar agendamentos.`,
        timestamp: new Date(),
        metadata: {
          'Taxa Atual': `${data.occupancyRate}%`,
          'Meta': '85%'
        },
        action: {
          label: 'Otimizar Agenda',
          onClick: () => console.log('Navigate to schedule optimization')
        }
      });
    }
  }
  
  // No-show rate analysis
  if (data?.noShowRate > 15) {
    insights.push({
      type: 'alert',
      priority: 'medium',
      title: 'Taxa de Faltas Elevada',
      message: `${data.noShowRate.toFixed(1)}% de faltas detectadas. Considere implementar lembretes automáticos.`,
      timestamp: new Date(),
      metadata: {
        'Taxa de Faltas': `${data.noShowRate}%`,
        'Meta': '< 10%'
      },
      action: {
        label: 'Configurar Lembretes',
        onClick: () => console.log('Navigate to reminder settings')
      }
    });
  }
  
  return insights;
}