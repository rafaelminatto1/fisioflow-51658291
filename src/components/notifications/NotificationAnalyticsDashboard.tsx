import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Calendar as CalendarIcon,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  Clock
} from 'lucide-react'
import { useNotificationAnalytics } from '@/hooks/useNotificationAnalytics'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell } from 'recharts'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export function NotificationAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  })

  const { 
    analyticsData, 
    optimizationSuggestions, 
    realtimeMetrics,
    isLoading, 
    exportAnalytics, 
    applyOptimization 
  } = useNotificationAnalytics(dateRange)

  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    setDateRange(range)
  }

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`
  const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics de Notificações</h1>
          <p className="text-muted-foreground">
            Análise detalhada de performance e engajamento
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(dateRange.from, 'dd/MM', { locale: ptBR })} - {format(dateRange.to, 'dd/MM', { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDateRangeChange({
                      from: subDays(new Date(), 7),
                      to: new Date()
                    })}
                  >
                    Últimos 7 dias
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDateRangeChange({
                      from: subDays(new Date(), 30),
                      to: new Date()
                    })}
                  >
                    Últimos 30 dias
                  </Button>
                </div>
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      handleDateRangeChange({ from: range.from, to: range.to })
                    }
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportAnalytics.mutate('csv')}
            disabled={exportAnalytics.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportAnalytics.mutate('json')}
            disabled={exportAnalytics.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar JSON
          </Button>
        </div>
      </div>

      {/* Optimization Suggestions */}
      {optimizationSuggestions.length > 0 && (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Sugestões de Otimização Disponíveis</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {optimizationSuggestions.slice(0, 2).map((suggestion, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{suggestion.title}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.expectedImprovement}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => applyOptimization.mutate(suggestion)}
                    >
                      Aplicar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enviadas</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.totalNotifications}</div>
              <p className="text-xs text-muted-foreground">
                Período selecionado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(analyticsData.deliveryRate)}</div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.deliveryRate > 0.9 ? 'Excelente' : analyticsData.deliveryRate > 0.8 ? 'Bom' : 'Precisa melhorar'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Clique</CardTitle>
              <PieChart className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(analyticsData.clickThroughRate)}</div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.clickThroughRate > 0.15 ? 'Excelente' : analyticsData.clickThroughRate > 0.1 ? 'Bom' : 'Precisa melhorar'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(analyticsData.errorRate)}</div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.errorRate < 0.05 ? 'Excelente' : analyticsData.errorRate < 0.1 ? 'Aceitável' : 'Alto'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(analyticsData.averageDeliveryTime)}</div>
              <p className="text-xs text-muted-foreground">
                Tempo de entrega
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="types">Por Tipo</TabsTrigger>
          <TabsTrigger value="timing">Horários</TabsTrigger>
          <TabsTrigger value="optimization">Otimização</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          {analyticsData && (
            <Card>
              <CardHeader>
                <CardTitle>Tendências de Engajamento</CardTitle>
                <CardDescription>Evolução das métricas ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analyticsData.engagementTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="sent" 
                      stroke="#8884d8" 
                      name="Enviadas"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="delivered" 
                      stroke="#82ca9d" 
                      name="Entregues"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="clicked" 
                      stroke="#ffc658" 
                      name="Clicadas"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="errors" 
                      stroke="#ff7300" 
                      name="Erros"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          {analyticsData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance por Tipo</CardTitle>
                  <CardDescription>Taxa de entrega e clique por categoria</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.typePerformance.map((type, index) => (
                      <div key={type.type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {type.type.replace('_', ' ')}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{type.sent} enviadas</Badge>
                            <Badge variant={type.deliveryRate > 0.8 ? 'default' : 'destructive'}>
                              {formatPercentage(type.deliveryRate)} entrega
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>Entregues: {type.delivered}</div>
                          <div>Clicadas: {type.clicked}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Tipo</CardTitle>
                  <CardDescription>Volume de notificações por categoria</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Tooltip />
                      <RechartsPieChart
                        data={analyticsData.typePerformance}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="sent"
                      >
                        {analyticsData.typePerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </RechartsPieChart>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          {analyticsData && (
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Horário</CardTitle>
                <CardDescription>Volume e taxa de entrega ao longo do dia</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.hourlyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Volume" />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="deliveryRate" 
                      stroke="#ff7300" 
                      name="Taxa de Entrega"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Sugestões de Otimização</CardTitle>
                <CardDescription>Recomendações baseadas nos dados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {optimizationSuggestions.map((suggestion, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{suggestion.title}</h4>
                        <Badge variant={
                          suggestion.priority === 'high' ? 'destructive' :
                          suggestion.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {suggestion.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                      <div className="text-xs space-y-1">
                        <p><strong>Melhoria esperada:</strong> {suggestion.expectedImprovement}</p>
                        <p><strong>Ação necessária:</strong> {suggestion.actionRequired}</p>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => applyOptimization.mutate(suggestion)}
                        disabled={applyOptimization.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aplicar Otimização
                      </Button>
                    </div>
                  ))}
                  
                  {optimizationSuggestions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhuma otimização necessária no momento</p>
                      <p className="text-sm">Seu sistema está funcionando bem!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {realtimeMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Métricas em Tempo Real</CardTitle>
                  <CardDescription>Status atual do sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Status do Sistema</span>
                      <Badge className={
                        realtimeMetrics.status === 'healthy' ? 'bg-green-500' :
                        realtimeMetrics.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                      }>
                        {realtimeMetrics.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Fila</p>
                        <p className="font-medium">{realtimeMetrics.queueSize}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Processando</p>
                        <p className="font-medium">{realtimeMetrics.processingBatches}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Taxa Atual</p>
                        <p className="font-medium">{formatPercentage(realtimeMetrics.metrics.deliveryRate)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Eficiência</p>
                        <p className="font-medium">{realtimeMetrics.metrics.batchEfficiency.toFixed(1)} not/s</p>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Última atualização: {realtimeMetrics.lastUpdate.toLocaleTimeString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}