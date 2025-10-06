import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEventosStats } from '@/hooks/useEventosStats';
import { BarChart, PieChart, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function EventosAnalytics() {
  const { data: stats, isLoading } = useEventosStats();

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  const statusData = [
    { name: 'Agendados', value: stats.eventosAgendados, color: 'bg-blue-500' },
    { name: 'Em Andamento', value: stats.eventosEmAndamento, color: 'bg-yellow-500' },
    { name: 'Concluídos', value: stats.eventosConcluidos, color: 'bg-green-500' },
  ];

  const maxValue = Math.max(...statusData.map(d => d.value));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gráficos de Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover-scale transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Status dos Eventos</CardTitle>
            <BarChart className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            {statusData.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">{item.value} eventos</span>
                </div>
                <Progress 
                  value={maxValue > 0 ? (item.value / maxValue) * 100 : 0} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Engajamento</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Taxa de Seguidores</span>
                  <span className="text-2xl font-bold text-primary">
                    {stats.percentualSeguidores.toFixed(0)}%
                  </span>
                </div>
                <Progress value={stats.percentualSeguidores} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.participantesSeguemPerfil} de {stats.totalParticipantes} participantes seguem o perfil
                </p>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Maior evento</span>
                  <span className="text-lg font-semibold">
                    {stats.eventoComMaisParticipantes} participantes
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Financeiro */}
      <Card className="hover-scale transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
          <DollarSign className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Custo Total</p>
              <p className="text-2xl font-bold">R$ {stats.custoTotal.toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Prestadores</p>
              <p className="text-2xl font-bold text-blue-600">
                R$ {stats.custoTotalPrestadores.toFixed(2)}
              </p>
              <Progress 
                value={(stats.custoTotalPrestadores / stats.custoTotal) * 100} 
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Insumos</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {stats.custoTotalInsumos.toFixed(2)}
              </p>
              <Progress 
                value={(stats.custoTotalInsumos / stats.custoTotal) * 100} 
                className="h-2"
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-muted-foreground">Pagamentos Pendentes</span>
              </div>
              <span className="text-lg font-semibold text-yellow-600">
                {stats.prestadoresPendentes} prestador(es)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
