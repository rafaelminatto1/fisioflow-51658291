/**
 * Acquisition Gaps Card Component
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Progress } from '@/components/shared/ui/progress';
import { Users, TrendingDown, AlertTriangle } from 'lucide-react';
import type { AcquisitionGap } from '@/lib/analytics/strategic/types';

interface AcquisitionGapsCardProps {
  gaps: AcquisitionGap[];
  title?: string;
  description?: string;
  showTable?: boolean;
}

export function AcquisitionGapsCard({
  gaps,
  title = "Períodos de Baixa Captação",
  description = "Identificamos períodos com menos novos pacientes que o esperado",
  showTable = false,
}: AcquisitionGapsCardProps) {
  if (gaps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum gap de captação detectado no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getClassificationColor = (classification: AcquisitionGap['classification']) => {
    switch (classification) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* List View */}
        {!showTable && (
          <div className="space-y-3">
            {gaps.slice(0, 5).map((gap, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${gap.classification === 'critical' ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-card'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{gap.period.label}</span>
                      <Badge className={getClassificationColor(gap.classification)} variant="secondary">
                        {gap.classification === 'critical' ? 'Crítico' :
                         gap.classification === 'low' ? 'Baixo' :
                         gap.classification === 'high' ? 'Alto' : 'Normal'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(gap.period.startDate)} - {formatDate(gap.period.endDate)}
                    </p>
                  </div>
                  {gap.classification === 'critical' && (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Novos Pacientes</p>
                    <p className="font-semibold text-lg">{gap.metrics.newPatients}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">vs Média</p>
                    <p className={`font-semibold text-lg ${gap.comparison.vsAverage < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {gap.comparison.vsAverage > 0 ? '+' : ''}{gap.comparison.vsAverage.toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Z-Score</p>
                    <p className="font-semibold text-lg">{gap.comparison.zScore.toFixed(2)}</p>
                  </div>
                </div>

                {gap.suggestedActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium mb-2">Ações Sugeridas:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {gap.suggestedActions.slice(0, 2).map((action, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Table View */}
        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium">Período</th>
                  <th className="text-left p-2 text-sm font-medium">Data Início</th>
                  <th className="text-left p-2 text-sm font-medium">Data Fim</th>
                  <th className="text-left p-2 text-sm font-medium">Novos Pacientes</th>
                  <th className="text-left p-2 text-sm font-medium">Avaliações</th>
                  <th className="text-left p-2 text-sm font-medium">vs Média</th>
                  <th className="text-left p-2 text-sm font-medium">Classificação</th>
                  <th className="text-left p-2 text-sm font-medium">Ações Sugeridas</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((gap, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2 text-sm font-medium">{gap.period.label}</td>
                    <td className="p-2 text-sm">{formatDate(gap.period.startDate)}</td>
                    <td className="p-2 text-sm">{formatDate(gap.period.endDate)}</td>
                    <td className="p-2 text-sm">{gap.metrics.newPatients}</td>
                    <td className="p-2 text-sm">{gap.metrics.evaluations}</td>
                    <td className="p-2 text-sm">
                      <span className={gap.comparison.vsAverage < 0 ? 'text-red-600' : 'text-green-600'}>
                        {gap.comparison.vsAverage > 0 ? '+' : ''}{gap.comparison.vsAverage.toFixed(0)}%
                      </span>
                    </td>
                    <td className="p-2 text-sm">
                      <Badge className={getClassificationColor(gap.classification)} variant="secondary">
                        {gap.classification === 'critical' ? 'Crítico' :
                         gap.classification === 'low' ? 'Baixo' :
                         gap.classification === 'high' ? 'Alto' : 'Normal'}
                      </Badge>
                    </td>
                    <td className="p-2 text-sm">
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        {gap.suggestedActions.slice(0, 2).map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
