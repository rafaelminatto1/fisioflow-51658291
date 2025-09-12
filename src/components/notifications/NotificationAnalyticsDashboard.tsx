import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Bell, 
  MousePointer, 
  AlertTriangle,
  Download,
  Calendar,
  Target,
  Activity
} from 'lucide-react'
import { 
  notificationAnalyticsService, 
  NotificationPerformanceReport,
  NotificationMetrics 
} from '@/lib/services/NotificationAnalyticsService'
import { NotificationType } from '@/types/notifications'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  description?: string
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, description }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change !== undefined && (
        <div className={cn(
          "flex items-center text-xs",
          change >= 0 ? "text-green-600" : "text-red-600"
        )}>
          {change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {Math.abs(change).toFixed(1)}% vs período anterior
        </div>
      )}
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
)

export const NotificationAnalyticsDashboard: React.FC = () => {
  const [report, setReport] = useState<NotificationPerformanceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const endDate = new Date()
      
      const performanceReport = await notificationAnalyticsService.getPerformanceReport(startDate, endDate)
      setReport(performanceReport)
    } catch (error) {
      console.error('Failed to load analytics:', error)
      toast.error('Erro ao carregar analytics')
    } finally {
      setLoading(false)
    }
  }

  const exportData = async () => {
    try {
      setExporting(true)
      
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const endDate = new Date()
      
      const csvData = await notificationAnalyticsService.exportAnalyticsToCSV(startDate, endDate, true)
      
      // Create and download file
      const blob = new Blob([csvData], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notification-analytics-${dateRange}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('Dados exportados com sucesso!')
    } catch (error) {
      console.error('Failed to export data:', error)
      toast.error('Erro ao exportar dados')
    } finally {
      setExporting(false)
    }
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`
  const formatNumber = (value: number) => value.toLocaleString('pt-BR')

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    )
  }

  // Prepare chart data
  const typeChartData = Object.entries(report.byType).map(([type, metrics]) => ({
    type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    sent: metrics.totalSent,
    delivered: metrics.totalDelivered,
    clicked: metrics.totalClicked,
    engagementRate: metrics.engagementRate
  }))

  const trendsChartData = report.trends.map(trend => ({
    date: new Date(trend.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
    sent: trend.sent,
    delivered: trend.delivered,
    clicked: trend.clicked
  }))

  const engagementPieData = Object.entries(report.byType).map(([type, metrics], index) => ({
    name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: metrics.totalClicked,
    color: COLORS[index % COLORS.length]
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics de Notificações</h2>
          <p className="text-muted-foreground">
            Acompanhe o desempenho e engajamento das notificações
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={dateRange} onValueChange={(value) => setDateRange(value as any)}>
            <TabsList>
              <TabsTrigger value="7d">7 dias</TabsTrigger>
              <TabsTrigger value="30d">30 dias</TabsTrigger>
              <TabsTrigger value="90d">90 dias</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button 
            variant="outline" 
            onClick={exportData}
            disabled={exporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Enviadas"
          value={formatNumber(report.overview.totalSent)}
          icon={<Bell className="w-4 h-4 text-blue-500" />}
          description="Notificações enviadas no período"
        />
        
        <MetricCard
          title="Taxa de Entrega"
          value={formatPercentage(report.overview.deliveryRate)}
          icon={<Target className="w-4 h-4 text-green-500" />}
          description="Notificações entregues com sucesso"
        />
        
        <MetricCard
          title="Taxa de Cliques"
          value={formatPercentage(report.overview.clickRate)}
          icon={<MousePointer className="w-4 h-4 text-purple-500" />}
          description="Usuários que clicaram nas notificações"
        />
        
        <MetricCard
          title="Engajamento Geral"
          value={formatPercentage(report.overview.engagementRate)}
          icon={<Activity className="w-4 h-4 text-orange-500" />}
          description="Taxa de engajamento total"
        />
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Performance por Tipo</CardTitle>
                <CardDescription>
                  Comparação de engajamento entre tipos de notificação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={typeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="type" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sent" fill="#8884d8" name="Enviadas" />
                    <Bar dataKey="clicked" fill="#82ca9d" name="Clicadas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Engagement Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Cliques</CardTitle>
                <CardDescription>
                  Cliques por tipo de notificação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={engagementPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {engagementPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas Detalhadas por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Tipo</th>
                      <th className="text-right p-2">Enviadas</th>
                      <th className="text-right p-2">Entregues</th>
                      <th className="text-right p-2">Clicadas</th>
                      <th className="text-right p-2">Taxa Entrega</th>
                      <th className="text-right p-2">Taxa Cliques</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.byType).map(([type, metrics]) => (
                      <tr key={type} className="border-b">
                        <td className="p-2 font-medium">
                          {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </td>
                        <td className="text-right p-2">{formatNumber(metrics.totalSent)}</td>
                        <td className="text-right p-2">{formatNumber(metrics.totalDelivered)}</td>
                        <td className="text-right p-2">{formatNumber(metrics.totalClicked)}</td>
                        <td className="text-right p-2">
                          <Badge variant={metrics.deliveryRate >= 85 ? 'default' : 'destructive'}>
                            {formatPercentage(metrics.deliveryRate)}
                          </Badge>
                        </td>
                        <td className="text-right p-2">
                          <Badge variant={metrics.clickRate >= 15 ? 'default' : 'secondary'}>
                            {formatPercentage(metrics.clickRate)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tendências ao Longo do Tempo</CardTitle>
              <CardDescription>
                Evolução das notificações nos últimos {dateRange}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sent" stroke="#8884d8" name="Enviadas" />
                  <Line type="monotone" dataKey="delivered" stroke="#82ca9d" name="Entregues" />
                  <Line type="monotone" dataKey="clicked" stroke="#ffc658" name="Clicadas" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Engaged Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Usuários Mais Engajados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.topEngagedUsers.slice(0, 5).map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.userName || 'Usuário Anônimo'}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.clickedNotifications}/{user.totalNotifications} cliques
                        </p>
                      </div>
                      <Badge variant="default">
                        {formatPercentage(user.engagementRate)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Low Engagement Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Usuários com Baixo Engajamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.lowEngagementUsers.slice(0, 5).map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.userName || 'Usuário Anônimo'}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.clickedNotifications}/{user.totalNotifications} cliques
                        </p>
                      </div>
                      <Badge variant="destructive">
                        {formatPercentage(user.engagementRate)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recomendações de Otimização</CardTitle>
              <CardDescription>
                Sugestões baseadas nos dados de performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">{index + 1}</span>
                    </div>
                    <p className="text-sm">{recommendation}</p>
                  </div>
                ))}
                
                {report.recommendations.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Parabéns! Suas notificações estão performando bem. Continue assim!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default NotificationAnalyticsDashboard