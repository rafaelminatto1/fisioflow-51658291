// Componente de métricas em tempo real usando RealtimeContext
// Refatorado para eliminar duplicação de subscriptions
// Agora usa o contexto central para obter dados de appointments
// Otimizado com React.memo e useMemo

import { useMemo, memo } from 'react';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, DollarSign, Calendar } from 'lucide-react';

export const RealtimeMetrics = memo(function RealtimeMetrics() {
  // Usar o contexto central para obter dados de appointments
  const { metrics, isSubscribed } = useRealtime();

  // Métricas formatadas para exibição - memoizadas para evitar recalculo
  const formattedRevenue = useMemo(() =>
    metrics.todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    [metrics.todayRevenue]
  );

  const occupancyRateFormatted = useMemo(() =>
    metrics.occupancyRate.toFixed(1),
    [metrics.occupancyRate]
  );

  const confirmationRate = useMemo(() =>
    metrics.totalAppointments > 0
      ? ((metrics.confirmedAppointments / metrics.totalAppointments) * 100).toFixed(1)
      : '0.0',
    [metrics.totalAppointments, metrics.confirmedAppointments]
  );

  const cancellationRate = useMemo(() =>
    metrics.totalAppointments > 0
      ? ((metrics.cancelledAppointments / metrics.totalAppointments) * 100).toFixed(1)
      : '0.0',
    [metrics.totalAppointments, metrics.cancelledAppointments]
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total de Agendamentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalAppointments}</div>
          <CardDescription>Agendamentos agendados</CardDescription>
        </CardContent>
      </Card>

      {/* Agendamentos Confirmados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
          <Activity className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {metrics.confirmedAppointments}
          </div>
          <CardDescription>{confirmationRate}%</CardDescription>
        </CardContent>
      </Card>

      {/* Agendamentos Cancelados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
          <Users className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {metrics.cancelledAppointments}
          </div>
          <CardDescription>{cancellationRate}%</CardDescription>
        </CardContent>
      </Card>

      {/* Pacientes em Sessão */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pacientes Hoje</CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {metrics.patientsInSession}
          </div>
          <CardDescription>Pacientes ativos na sessão</CardDescription>
        </CardContent>
      </Card>

      {/* Receita de Hoje */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita Hoje</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            R$ {formattedRevenue}
          </div>
          <CardDescription>Consultas pagas hoje</CardDescription>
        </CardContent>
      </Card>

      {/* Taxa de Ocupação */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
          <Calendar className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {occupancyRateFormatted}%
          </div>
          <CardDescription>
            {metrics.occupancyRate >= 80
              ? 'Excelente (≥80%)'
              : metrics.occupancyRate >= 50
              ? 'Bom (≥50%)'
              : 'Precisa atenção (<50%)'}
          </CardDescription>
        </CardContent>
      </Card>

      {/* Última Atualização */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status da Conexão</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {isSubscribed ? (
              <span className="flex items-center gap-2 text-green-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Sincronização ativa
              </span>
            ) : (
              <span className="flex items-center gap-2 text-yellow-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-pulse relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                </span>
                Conectando...
              </span>
            )}
          </div>
          <CardDescription>
            {isSubscribed
              ? 'Dados em tempo real'
              : 'Aguardando conexão'}
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
});
