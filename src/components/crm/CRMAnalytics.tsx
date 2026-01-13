import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3, TrendingUp, Users, Thermometer,
  Target, Clock, AlertTriangle, Award
} from 'lucide-react';
import { useCRMAnalytics, useNPSMetrics } from '@/hooks/useCRM';
import { useLeadMetrics } from '@/hooks/useLeads';

const ESTAGIOS_LABELS: Record<string, string> = {
  aguardando: 'Aguardando',
  em_contato: 'Em Contato',
  avaliacao_agendada: 'Avaliação Agendada',
  avaliacao_realizada: 'Avaliação Realizada',
  efetivado: 'Efetivado',
  nao_efetivado: 'Não Efetivado',
};

const TEMPERATURA_COLORS: Record<string, string> = {
  quente: 'bg-rose-500',
  morno: 'bg-amber-500',
  frio: 'bg-blue-500',
};

export function CRMAnalytics() {
  const { data: analytics, isLoading } = useCRMAnalytics();
  const { data: leadMetrics } = useLeadMetrics();
  const { data: npsMetrics } = useNPSMetrics();

  if (isLoading || !analytics) {
    return <div className="animate-pulse h-96 bg-muted rounded-lg" />;
  }

  const { conversionBySource, temperatureDistribution, stageAnalysis, coldLeads, totalLeads } = analytics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics do CRM
        </h2>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalLeads}</div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/20">
                <Target className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{leadMetrics?.taxaConversao}%</div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{coldLeads}</div>
                <p className="text-sm text-muted-foreground">Leads Frios (7+ dias)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/20">
                <Award className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{npsMetrics?.nps || 0}</div>
                <p className="text-sm text-muted-foreground">NPS Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Conversão por Origem */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversão por Origem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conversionBySource
                .sort((a, b) => b.taxa - a.taxa)
                .map((item) => (
                  <div key={item.origem} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.origem}</span>
                      <span className="text-muted-foreground">
                        {item.convertidos}/{item.total} ({item.taxa}%)
                      </span>
                    </div>
                    <Progress value={item.taxa} className="h-2" />
                  </div>
                ))}
              {conversionBySource.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Nenhum dado disponível</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Temperatura dos Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Temperatura dos Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(temperatureDistribution).map(([temp, count]) => {
                const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                const labels: Record<string, string> = { quente: 'Quente 🔥', morno: 'Morno ☀️', frio: 'Frio ❄️' };
                return (
                  <div key={temp} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{labels[temp] || temp}</span>
                      <span className="text-muted-foreground">{count} leads ({percentage}%)</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${TEMPERATURA_COLORS[temp] || 'bg-slate-500'} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Leads por Estágio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Leads por Estágio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stageAnalysis.map((item) => (
                <div key={item.estagio} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ESTAGIOS_LABELS[item.estagio] || item.estagio}</Badge>
                    <span className="text-sm font-medium">{item.count} leads</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Score médio: <span className="font-medium">{item.avgScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* NPS Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              NPS - Net Promoter Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {npsMetrics && npsMetrics.total > 0 ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className={`text-5xl font-bold ${npsMetrics.nps >= 50 ? 'text-emerald-500' : npsMetrics.nps >= 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {npsMetrics.nps}
                  </div>
                  <p className="text-muted-foreground mt-1">
                    {npsMetrics.nps >= 70 ? 'Excelente!' : npsMetrics.nps >= 50 ? 'Muito Bom' : npsMetrics.nps >= 0 ? 'Bom' : 'Precisa Melhorar'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-emerald-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600">{npsMetrics.promotores}</div>
                    <p className="text-xs text-muted-foreground">Promotores</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">{npsMetrics.neutros}</div>
                    <p className="text-xs text-muted-foreground">Neutros</p>
                  </div>
                  <div className="p-3 bg-rose-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-rose-600">{npsMetrics.detratores}</div>
                    <p className="text-xs text-muted-foreground">Detratores</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma pesquisa NPS realizada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
