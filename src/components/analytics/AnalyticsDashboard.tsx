import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
} from 'recharts';
import {
  Activity,
  Users,
  Calendar,
  TrendingUp,
  Clock,
  MousePointer,
  Eye,
  Zap,
  AlertTriangle,
  CheckCircle,
  Download
} from 'lucide-react';
import { analytics, useAnalytics, UserMetrics, PerformanceMetrics } from '@/utils/analytics';

interface AnalyticsData {
  userMetrics: UserMetrics;
  performanceMetrics: PerformanceMetrics;
  businessMetrics: any;
  realtimeData: any;
}

interface MetricCard {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  description?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const { trackFeature } = useAnalytics();

  useEffect(() => {
    loadAnalyticsData();
    trackFeature('analytics', 'dashboard_view');
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Simulated data - replace with actual API calls
      const data: AnalyticsData = {
        userMetrics: analytics.getUserMetrics(),
        performanceMetrics: {
          pageLoadTime: 1200,
          firstContentfulPaint: 800,
          largestContentfulPaint: 1500,
          cumulativeLayoutShift: 0.05,
          firstInputDelay: 50,
          timeToInteractive: 1800
        },
        businessMetrics: {
          appointments: {
            created: 45,
            completed: 38,
            cancelled: 4,
            rescheduled: 3
          },
          patients: {
            new: 12,
            returning: 26,
            active: 89
          },
          revenue: {
            total: 15750,
            byService: {
              'Fisioterapia': 8500,
              'Pilates': 4200,
              'Massoterapia': 2050,
              'Acupuntura': 1000
            }
          }
        },
        realtimeData: {
          activeUsers: 23,
          pageViews: 156,
          bounceRate: 0.32,
          avgSessionDuration: 420
        }
      };
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    trackFeature('analytics', 'export_data');
    // Implementation for data export
    console.log('Exporting analytics data...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-600">Falha ao carregar dados de analytics</p>
        <Button onClick={loadAnalyticsData} className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Métricas e insights do FisioFlow</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {['24h', '7d', '30d', '90d'].map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(range)}
          >
            {range}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="business">Negócio</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewMetrics analyticsData={analyticsData} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RealtimeChart data={analyticsData.realtimeData} />
            <TopPagesChart />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceMetrics metrics={analyticsData.performanceMetrics} />
          <PerformanceCharts metrics={analyticsData.performanceMetrics} />
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <BusinessMetrics metrics={analyticsData.businessMetrics} />
          <BusinessCharts metrics={analyticsData.businessMetrics} />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserMetrics metrics={analyticsData.userMetrics} />
          <UserBehaviorCharts />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewMetrics({ analyticsData }: { analyticsData: AnalyticsData }) {
  const metrics: MetricCard[] = [
    {
      title: 'Usuários Ativos',
      value: analyticsData.realtimeData.activeUsers,
      change: '+12%',
      trend: 'up',
      icon: <Users className="h-4 w-4" />,
      description: 'Usuários online agora'
    },
    {
      title: 'Visualizações',
      value: analyticsData.realtimeData.pageViews,
      change: '+8%',
      trend: 'up',
      icon: <Eye className="h-4 w-4" />,
      description: 'Páginas visualizadas hoje'
    },
    {
      title: 'Taxa de Rejeição',
      value: `${(analyticsData.realtimeData.bounceRate * 100).toFixed(1)}%`,
      change: '-5%',
      trend: 'up',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Sessões com uma página'
    },
    {
      title: 'Duração da Sessão',
      value: `${Math.floor(analyticsData.realtimeData.avgSessionDuration / 60)}m`,
      change: '+15%',
      trend: 'up',
      icon: <Clock className="h-4 w-4" />,
      description: 'Tempo médio no site'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            {metric.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {metric.change && (
                <Badge
                  variant={metric.trend === 'up' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {metric.change}
                </Badge>
              )}
              <span>{metric.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PerformanceMetrics({ metrics }: { metrics: PerformanceMetrics }) {
  const performanceCards = [
    {
      title: 'Tempo de Carregamento',
      value: `${(metrics.pageLoadTime / 1000).toFixed(2)}s`,
      rating: metrics.pageLoadTime < 2000 ? 'good' : metrics.pageLoadTime < 4000 ? 'fair' : 'poor',
      icon: <Zap className="h-4 w-4" />
    },
    {
      title: 'First Contentful Paint',
      value: `${(metrics.firstContentfulPaint / 1000).toFixed(2)}s`,
      rating: metrics.firstContentfulPaint < 1800 ? 'good' : metrics.firstContentfulPaint < 3000 ? 'fair' : 'poor',
      icon: <Activity className="h-4 w-4" />
    },
    {
      title: 'Largest Contentful Paint',
      value: `${(metrics.largestContentfulPaint / 1000).toFixed(2)}s`,
      rating: metrics.largestContentfulPaint < 2500 ? 'good' : metrics.largestContentfulPaint < 4000 ? 'fair' : 'poor',
      icon: <CheckCircle className="h-4 w-4" />
    },
    {
      title: 'Cumulative Layout Shift',
      value: metrics.cumulativeLayoutShift.toFixed(3),
      rating: metrics.cumulativeLayoutShift < 0.1 ? 'good' : metrics.cumulativeLayoutShift < 0.25 ? 'fair' : 'poor',
      icon: <MousePointer className="h-4 w-4" />
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {performanceCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            {card.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <Badge
              variant={card.rating === 'good' ? 'default' : card.rating === 'fair' ? 'secondary' : 'destructive'}
              className="text-xs mt-2"
            >
              {card.rating === 'good' ? 'Bom' : card.rating === 'fair' ? 'Regular' : 'Ruim'}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BusinessMetrics({ metrics }: { metrics: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Consultas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>Criadas</span>
            <span className="font-semibold">{metrics.appointments.created}</span>
          </div>
          <div className="flex justify-between">
            <span>Concluídas</span>
            <span className="font-semibold text-green-600">{metrics.appointments.completed}</span>
          </div>
          <div className="flex justify-between">
            <span>Canceladas</span>
            <span className="font-semibold text-red-600">{metrics.appointments.cancelled}</span>
          </div>
          <Progress 
            value={(metrics.appointments.completed / metrics.appointments.created) * 100} 
            className="mt-4"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pacientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>Novos</span>
            <span className="font-semibold text-blue-600">{metrics.patients.new}</span>
          </div>
          <div className="flex justify-between">
            <span>Retornando</span>
            <span className="font-semibold">{metrics.patients.returning}</span>
          </div>
          <div className="flex justify-between">
            <span>Ativos</span>
            <span className="font-semibold text-green-600">{metrics.patients.active}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receita Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            R$ {metrics.revenue.total.toLocaleString()}
          </div>
          <p className="text-sm text-gray-600 mt-2">Últimos 30 dias</p>
        </CardContent>
      </Card>
    </div>
  );
}

function UserMetrics({ metrics }: { metrics: UserMetrics }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Duração da Sessão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.floor(metrics.sessionDuration / 60000)}m {Math.floor((metrics.sessionDuration % 60000) / 1000)}s
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Páginas Visualizadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.pageViews}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Interações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.interactions}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Funcionalidades Usadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.features.length}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {metrics.features.slice(0, 3).map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RealtimeChart({ data }: { data: any }) {
  const chartData = [
    { time: '00:00', users: 12, views: 45 },
    { time: '04:00', users: 8, views: 32 },
    { time: '08:00', users: 25, views: 89 },
    { time: '12:00', users: 35, views: 124 },
    { time: '16:00', users: 28, views: 98 },
    { time: '20:00', users: 23, views: 76 }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade em Tempo Real</CardTitle>
        <CardDescription>Usuários e visualizações nas últimas 24h</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
            <Line type="monotone" dataKey="views" stroke="#82ca9d" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TopPagesChart() {
  const data = [
    { page: '/dashboard', views: 245, bounce: 0.25 },
    { page: '/appointments', views: 189, bounce: 0.18 },
    { page: '/patients', views: 156, bounce: 0.32 },
    { page: '/reports', views: 98, bounce: 0.45 },
    { page: '/settings', views: 67, bounce: 0.38 }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Páginas Mais Visitadas</CardTitle>
        <CardDescription>Visualizações e taxa de rejeição</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="page" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="views" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PerformanceCharts({ metrics }: { metrics: PerformanceMetrics }) {
  const data = [
    { metric: 'Page Load', value: metrics.pageLoadTime / 1000, target: 2 },
    { metric: 'FCP', value: metrics.firstContentfulPaint / 1000, target: 1.8 },
    { metric: 'LCP', value: metrics.largestContentfulPaint / 1000, target: 2.5 },
    { metric: 'FID', value: metrics.firstInputDelay, target: 100 },
    { metric: 'TTI', value: metrics.timeToInteractive / 1000, target: 3.8 }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas de Performance</CardTitle>
        <CardDescription>Valores atuais vs. metas recomendadas</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
            <Bar dataKey="target" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function BusinessCharts({ metrics }: { metrics: any }) {
  const revenueData = Object.entries(metrics.revenue.byService).map(([service, value]) => ({
    name: service,
    value: value as number
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Receita por Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R$ ${value}`} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status das Consultas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { status: 'Concluídas', count: metrics.appointments.completed },
              { status: 'Canceladas', count: metrics.appointments.cancelled },
              { status: 'Reagendadas', count: metrics.appointments.rescheduled }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function UserBehaviorCharts() {
  const behaviorData = [
    { hour: '00', sessions: 12 },
    { hour: '04', sessions: 8 },
    { hour: '08', sessions: 45 },
    { hour: '12', sessions: 67 },
    { hour: '16', sessions: 54 },
    { hour: '20', sessions: 32 }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Padrão de Uso por Horário</CardTitle>
        <CardDescription>Sessões de usuário ao longo do dia</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={behaviorData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="sessions" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default AnalyticsDashboard;