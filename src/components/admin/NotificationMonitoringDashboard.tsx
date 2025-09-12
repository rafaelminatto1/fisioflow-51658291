import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Bell,
  Users,
  Zap
} from 'lucide-react';
import { notificationPerformanceService } from '@/lib/services/NotificationPerformanceService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface PerformanceMetrics {
  deliveryRate: number;
  averageDeliveryTime: number;
  clickThroughRate: number;
  errorRate: number;
  batchSize: number;
  queueLength: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: PerformanceMetrics;
  issues: string[];
}

export function NotificationMonitoringDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const [currentMetrics, health, historical] = await Promise.all([
        notificationPerformanceService.getCurrentMetrics(),
        notificationPerformanceService.getSystemHealth(),
        notificationPerformanceService.getHistoricalMetrics(24)
      ]);

      setMetrics(currentMetrics);
      setSystemHealth(health);
      setHistoricalData(historical.map((data, index) => ({
        ...data,
        time: index
      })));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    return `${seconds.toFixed(1)}s`;
  };

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Carregando métricas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Monitoramento de Notificações
          </h1>
          <p className="text-gray-600">
            Última atualização: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={loadDashboardData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* System Health Status */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(systemHealth.status)}
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <Badge className={getStatusColor(systemHealth.status)}>
                {systemHealth.status === 'healthy' && 'Saudável'}
                {systemHealth.status === 'degraded' && 'Degradado'}
                {systemHealth.status === 'unhealthy' && 'Não Saudável'}
              </Badge>
              <span className="text-sm text-gray-500">
                {systemHealth.issues.length} problema(s) detectado(s)
              </span>
            </div>
            
            {systemHealth.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Problemas Detectados:</h4>
                <ul className="space-y-1">
                  {systemHealth.issues.map((issue, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.deliveryRate.toFixed(1)}%</div>
              <Progress value={metrics.deliveryRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {metrics.deliveryRate >= 95 ? 'Excelente' : 
                 metrics.deliveryRate >= 90 ? 'Bom' : 'Precisa melhorar'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(metrics.averageDeliveryTime)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Tempo médio de entrega
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Cliques</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.clickThroughRate.toFixed(1)}%</div>
              <Progress value={metrics.clickThroughRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Engajamento dos usuários
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fila de Envio</CardTitle>
              <Bell className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.queueLength}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Lotes pendentes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Entrega (24h)</CardTitle>
            <CardDescription>
              Histórico da taxa de entrega nas últimas 24 horas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa de Entrega']}
                />
                <Line 
                  type="monotone" 
                  dataKey="deliveryRate" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tempo de Entrega (24h)</CardTitle>
            <CardDescription>
              Histórico do tempo médio de entrega
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [formatTime(value), 'Tempo Médio']}
                />
                <Area 
                  type="monotone" 
                  dataKey="averageDeliveryTime" 
                  stroke="#3b82f6" 
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Error Rate and Click Through Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Erro (24h)</CardTitle>
            <CardDescription>
              Monitoramento de falhas na entrega
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 'dataMax']} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa de Erro']}
                />
                <Line 
                  type="monotone" 
                  dataKey="errorRate" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engajamento (24h)</CardTitle>
            <CardDescription>
              Taxa de cliques nas notificações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 'dataMax']} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa de Cliques']}
                />
                <Line 
                  type="monotone" 
                  dataKey="clickThroughRate" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Recomendações de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics && metrics.deliveryRate < 95 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <TrendingDown className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">
                    Taxa de entrega baixa
                  </h4>
                  <p className="text-sm text-yellow-700">
                    Considere reduzir o tamanho dos lotes ou verificar a conectividade 
                    com o serviço de push notifications.
                  </p>
                </div>
              </div>
            )}

            {metrics && metrics.averageDeliveryTime > 30 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">
                    Tempo de entrega elevado
                  </h4>
                  <p className="text-sm text-blue-700">
                    O tempo médio de entrega está acima do ideal. Considere otimizar 
                    o processamento em lotes ou aumentar a capacidade do servidor.
                  </p>
                </div>
              </div>
            )}

            {metrics && metrics.clickThroughRate < 5 && (
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <Users className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-800">
                    Baixo engajamento
                  </h4>
                  <p className="text-sm text-purple-700">
                    A taxa de cliques está baixa. Considere personalizar melhor o 
                    conteúdo das notificações ou ajustar os horários de envio.
                  </p>
                </div>
              </div>
            )}

            {metrics && metrics.queueLength > 50 && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <Bell className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800">
                    Fila de envio grande
                  </h4>
                  <p className="text-sm text-orange-700">
                    Há muitos lotes pendentes na fila. Considere aumentar a frequência 
                    de processamento ou a capacidade de envio.
                  </p>
                </div>
              </div>
            )}

            {(!metrics || (
              metrics.deliveryRate >= 95 && 
              metrics.averageDeliveryTime <= 30 && 
              metrics.clickThroughRate >= 5 && 
              metrics.queueLength <= 50
            )) && (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">
                    Sistema funcionando bem
                  </h4>
                  <p className="text-sm text-green-700">
                    Todas as métricas estão dentro dos parâmetros ideais. 
                    Continue monitorando para manter a performance.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}