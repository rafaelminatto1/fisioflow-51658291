import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEventosStats } from '@/hooks/useEventosStats';
import { BarChart, Users, DollarSign } from 'lucide-react';
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
    { name: 'Agendados', value: stats.eventosAtivos, color: 'bg-blue-500' },
    { name: 'Em Andamento', value: stats.eventosAtivos, color: 'bg-yellow-500' },
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
                  <span className="text-sm font-medium">Total de Participantes</span>
                  <span className="text-2xl font-bold text-primary">
                    {stats.totalParticipantes}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Média: {stats.mediaParticipantesPorEvento} participantes por evento
                </p>
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
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.receitaTotal)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Custo Total</p>
              <p className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.custoTotal)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Margem Média</p>
              <p className="text-2xl font-bold text-primary">
                {stats.margemMedia}%
              </p>
              <Progress value={stats.margemMedia} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
