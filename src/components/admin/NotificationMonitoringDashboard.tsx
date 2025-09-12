import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react'
import { notificationPerformanceService } from '@/lib/services/NotificationPerformanceService'
import { supabase } from '@/integrations/supabase/client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical'
  metrics: {
    deliveryRate: number
    averageDeliveryTime: number
    clickThroughRate: number
    errorRate: number
    batchEfficiency: number
  }
  queueSize: number
  processingBatches: number
  lastUpdate: Date
}

interface PerformanceData {
  timestamp: string
  deliveryRate: number
  errorRate: number
  deliveryTime: number
  batchEfficiency: number
}

interface NotificationStats {
  totalSent: number
  totalDelivered: number
  totalClicked: number
  totalErrors: number
  byType: Record<string, number>
  byHour: Array<{ hour: number; count: number }>
}

export function NotificationMonitoringDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [notificationStats, setNotificationStats] = useState<NotificationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Load initial data
  useEffect(() => {
    loadDashboardData()
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Load system health
      const health = await notificationPerformanceService.getSystemHealth()
      setSystemHealth(health)

      // Load performance metrics from last 24 hours
      const { data: metricsData } = await supabase
        .from('notification_performance_metrics')
        .select('*')
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: true })

      if (metricsData) {
        const formattedData = metricsData.map(record => ({
          timestamp: new Date(record.recorded_at).toLocaleTimeString(),
          deliveryRate: record.delivery_rate * 100,
          errorRate: record.error_rate * 100,
          deliveryTime: record.delivery_time_ms,
          batchEfficiency: record.batch_efficiency
        }))
        setPerformanceData(formattedData)
      }

      // Load notification statistics
      await loadNotificationStats()
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadNotificationStats = async () => {
    const { data: historyData } = await supabase
      .from('notification_history')
      .select('type, status, sent_at, clicked_at')
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (historyData) {
      const stats: NotificationStats = {
        totalSent: historyData.length,
        totalDelivered: historyData.filter(n => n.status === 'delivered').length,
        totalClicked: historyData.filter(n => n.clicked_at).length,
        totalErrors: historyData.filter(n => n.status === 'failed').length,
        byType: {},
        byHour: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))
      }

      // Group by type
      historyData.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1
        
        // Group by hour
        const hour = new Date(notification.sent_at).getHours()
        stats.byHour[hour].count++
      })

      setNotificationStats(stats)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500'
      case 'degraded': return 'bg-yellow-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />
      case 'degraded': return <AlertTriangle className="h-4 w-4" />
      case 'critical': return <AlertTriangle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const exportMetrics = async () => {
    try {
      const { data } = await supabase
        .from('notification_performance_metrics')
        .select('*')
        .gte('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: true })

      if (data) {
        const csv = [
          'Timestamp,Delivery Rate,Error Rate,Delivery Time (ms),Batch Efficiency',
          ...data.map(record => 
            `${record.recorded_at},${record.delivery_rate},${record.error_rate},${record.delivery_time_ms},${record.batch_efficiency}`
          )
        ].join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `notification-metrics-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export metrics:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoramento de Notificações</h1>
          <p className="text-muted-foreground">
            Acompanhe a performance e saúde do sistema de notificações em tempo real
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Auto Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={exportMetrics}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* System Health Alert */}
      {systemHealth && systemHealth.status !== 'healthy' && (
        <Alert variant={systemHealth.status === 'critical' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Sistema em estado {systemHealth.status === 'degraded' ? 'degradado' : 'crítico'}. 
            Taxa de erro: {(systemHealth.metrics.errorRate * 100).toFixed(1)}%, 
            Taxa de entrega: {(systemHealth.metrics.deliveryRate * 100).toFixed(1)}%
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Overview */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
              {getStatusIcon(systemHealth.status)}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(systemHealth.status)}>
                  {systemHealth.status.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Atualizado: {systemHealth.lastUpdate.toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(systemHealth.metrics.deliveryRate * 100).toFixed(1)}%
              </div>
              <Progress value={systemHealth.metrics.deliveryRate * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(systemHealth.metrics.averageDeliveryTime / 1000).toFixed(1)}s
              </div>
              <p className="text-xs text-muted-foreground">
                Eficiência: {systemHealth.metrics.batchEfficiency.toFixed(1)} not/s
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fila de Processamento</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.queueSize}</div>
              <p className="text-xs text-muted-foreground">
                {systemHealth.processingBatches} lotes processando
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Metrics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
          <TabsTrigger value="errors">Erros</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Entrega (24h)</CardTitle>
                <CardDescription>Porcentagem de notificações entregues com sucesso</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Taxa de Entrega']} />
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
                <CardDescription>Tempo médio para processar notificações</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}ms`, 'Tempo de Entrega']} />
                    <Line 
                      type="monotone" 
                      dataKey="deliveryTime" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          {notificationStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas Gerais (24h)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {notificationStats.totalSent}
                      </div>
                      <div className="text-sm text-muted-foreground">Enviadas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {notificationStats.totalDelivered}
                      </div>
                      <div className="text-sm text-muted-foreground">Entregues</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {notificationStats.totalClicked}
                      </div>
                      <div className="text-sm text-muted-foreground">Clicadas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {notificationStats.totalErrors}
                      </div>
                      <div className="text-sm text-muted-foreground">Erros</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Por Tipo</h4>
                    {Object.entries(notificationStats.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Hora</CardTitle>
                  <CardDescription>Volume de notificações ao longo do dia</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={notificationStats.byHour}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Taxa de Erro (24h)</CardTitle>
              <CardDescription>Porcentagem de notificações que falharam</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis domain={[0, 'dataMax']} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Taxa de Erro']} />
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
        </TabsContent>
      </Tabs>
    </div>
  )
}