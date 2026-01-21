/**
 * Insights Table Component - Detailed table view with actions
 */

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import { MoreHorizontal, Eye, Check, X, AlertCircle } from 'lucide-react';
import { useAcknowledgeInsight, useDismissInsight } from '@/hooks/analytics/useStrategicInsights';
import { toast } from '@/components/ui/use-toast';
import type { StrategicInsight } from '@/lib/analytics/strategic/types';

interface InsightsTableProps {
  insights: StrategicInsight[];
  organizationId?: string;
  title?: string;
}

export function InsightsTable({ insights, organizationId, title = "Insights Estratégicos" }: InsightsTableProps) {
  const acknowledgeInsight = useAcknowledgeInsight();
  const dismissInsight = useDismissInsight();

  const handleAcknowledge = async (insightId: string) => {
    try {
      await acknowledgeInsight.mutateAsync({ insightId });
      toast({ title: "Insight reconhecido" });
    } catch (error) {
      toast({
        title: "Erro ao reconhecer insight",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = async (insightId: string) => {
    try {
      await dismissInsight.mutateAsync({ insightId });
      toast({ title: "Insight descartado" });
    } catch (error) {
      toast({
        title: "Erro ao descartar insight",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Crítico';
      case 'high': return 'Alto';
      case 'medium': return 'Médio';
      case 'low': return 'Baixo';
      default: return priority;
    }
  };

  const getInsightTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'low_demand_slot': 'Horário com Baixa Demanda',
      'low_acquisition_period': 'Período de Baixa Captação',
      'revenue_opportunity': 'Oportunidade de Receita',
      'retention_risk': 'Risco de Retenção',
      'seasonal_pattern': 'Padrão Sazonal',
      'operational_inefficiency': 'Ineficiência Operacional',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      'detected': 'default',
      'acknowledged': 'secondary',
      'addressed': 'outline',
      'dismissed': 'outline',
    };
    const labels: Record<string, string> = {
      'detected': 'Detectado',
      'acknowledged': 'Reconhecido',
      'addressed': 'Resolvido',
      'dismissed': 'Descartado',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum insight detectado no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prioridade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Impacto</TableHead>
              <TableHead>Recomendações</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {insights.map((insight) => (
              <TableRow key={insight.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(insight.priority)}`} />
                    <span className="font-medium">{getPriorityLabel(insight.priority)}</span>
                  </div>
                </TableCell>
                <TableCell>{getInsightTypeLabel(insight.insight_type)}</TableCell>
                <TableCell>
                  {format(parseISO(insight.insight_date), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell>{getStatusBadge(insight.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${insight.impact_score}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{insight.impact_score}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <ul className="text-xs text-muted-foreground">
                    {insight.recommendations.slice(0, 2).map((rec, i) => (
                      <li key={i}>• {rec}</li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAcknowledge(insight.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Reconhecer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDismiss(insight.id)}>
                        <X className="h-4 w-4 mr-2" />
                        Descartar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
