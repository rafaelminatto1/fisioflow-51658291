import { InsightCardProps } from '@/components/analytics/InsightCard';

// Automated insight generation utility
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