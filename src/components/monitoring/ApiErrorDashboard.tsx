import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Zap, 
  Activity,
  Clock,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

interface ApiErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByPath: Record<string, number>;
  recentErrors: Array<{
    type: string;
    path: string;
    message: string;
    timestamp: number;
    status?: number;
  }>;
  uptime: number;
  avgResponseTime: number;
  successRate: number;
}

export function ApiErrorDashboard() {
  const [stats, setStats] = useState<ApiErrorStats | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoRefresh) {
      interval = setInterval(() => {
        loadStats();
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadStats = () => {
    // In a real implementation, this would fetch stats from your monitoring system
    // For now, we'll use a mock implementation
    const mockStats: ApiErrorStats = {
      totalErrors: 127,
      errorsByType: {
        network: 45,
        timeout: 23,
        server_transient: 31,
        server_persistent: 18,
        client: 10,
      },
      errorsByPath: {
        '/api/patients': 67,
        '/api/appointments': 23,
        '/api/search': 15,
        '/api/stats': 12,
        '/other': 10,
      },
      recentErrors: [
        {
          type: 'server_transient',
          path: '/api/patients',
          message: 'Service temporarily unavailable',
          timestamp: Date.now() - 30000,
          status: 503,
        },
        {
          type: 'timeout',
          path: '/api/search',
          message: 'Request timeout after 10000ms',
          timestamp: Date.now() - 120000,
          status: 0,
        },
        {
          type: 'network',
          path: '/api/appointments',
          message: 'Network error: Failed to fetch',
          timestamp: Date.now() - 180000,
          status: 0,
        },
      ],
      uptime: 98.5,
      avgResponseTime: 450,
      successRate: 97.3,
    };

    setStats(mockStats);
  };

  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case 'network':
        return <Activity className="h-4 w-4" />;
      case 'timeout':
        return <Clock className="h-4 w-4" />;
      case 'server_transient':
        return <RefreshCw className="h-4 w-4" />;
      case 'server_persistent':
        return <XCircle className="h-4 w-4" />;
      case 'client':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getErrorSeverityColor = (type: string) => {
    switch (type) {
      case 'network':
        return 'warning';
      case 'timeout':
        return 'warning';
      case 'server_transient':
        return 'secondary';
      case 'server_persistent':
        return 'destructive';
      case 'client':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getTimeSince = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const getTrendIcon = (value: number, threshold: number) => {
    if (value < threshold * 0.8) {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    }
    if (value > threshold) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Error Dashboard</CardTitle>
          <CardDescription>Monitoramento de erros da API em tempo real</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground mb-4">
              Clique abaixo para iniciar o monitoramento
            </p>
            <Button onClick={() => {
              setIsMonitoring(true);
              loadStats();
            }}>
              Iniciar Monitoramento
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Error Dashboard</h2>
          <p className="text-muted-foreground">
            Monitoramento em tempo real de erros e performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto-refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadStats}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Erros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.totalErrors}</div>
              {getTrendIcon(stats.totalErrors, 100)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.uptime}%</div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              {getTrendIcon(stats.successRate, 95)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Médio de Resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.avgResponseTime}ms</div>
              {getTrendIcon(stats.avgResponseTime, 500)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Errors by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Erros por Tipo</CardTitle>
            <CardDescription>Distribuição de erros por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.errorsByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getErrorTypeIcon(type)}
                      <span className="capitalize text-sm">{type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getErrorSeverityColor(type)}>
                        {count}
                      </Badge>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${(count / stats.totalErrors) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Errors by Path */}
        <Card>
          <CardHeader>
            <CardTitle>Erros por Endpoint</CardTitle>
            <CardDescription>Endpoints mais problemáticos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.errorsByPath)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([path, count]) => (
                  <div key={path} className="flex items-center justify-between">
                    <span className="text-sm font-mono">{path}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={count > 50 ? 'destructive' : count > 20 ? 'warning' : 'secondary'}>
                        {count}
                      </Badge>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            count > 50 ? 'bg-red-500' : count > 20 ? 'bg-yellow-500' : 'bg-primary'
                          }`}
                          style={{
                            width: `${(count / stats.totalErrors) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Erros Recentes</CardTitle>
          <CardDescription>Últimos erros registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.recentErrors.map((error, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="mt-1">
                  {getErrorTypeIcon(error.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{error.path}</span>
                      {error.status && (
                        <Badge variant={getErrorSeverityColor(error.type)}>{error.status}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {getTimeSince(error.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{error.message}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {stats.totalErrors > 100 && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Alerta: Alta Taxa de Erros</CardTitle>
            </div>
            <CardDescription>
              A taxa de erros está acima do limite aceitável. Considere revisar a estabilidade do endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm">
                <Activity className="h-4 w-4 mr-2" />
                Ver Detalhes no Sentry
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reiniciar Circuit Breaker
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
