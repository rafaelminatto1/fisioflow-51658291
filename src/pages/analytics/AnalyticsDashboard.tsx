import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Users, 
  Calendar,
  Heart,
  Clock,
  AlertCircle,
  Download
} from 'lucide-react';
import { subDays } from 'date-fns';


import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/analytics/MetricCard';
import { ChartContainer } from '@/components/analytics/ChartContainer';
import { InsightCard, generateInsights } from '@/components/analytics/InsightCard';
import { FilterBar, FilterConfig } from '@/components/analytics/FilterBar';
import { 
  useKPIMetrics, 
  useFinancialAnalytics, 
  useClinicalAnalytics,
  useOperationalAnalytics,
  usePatientDistribution,
  useRealtimeMetrics
} from '@/hooks/useAnalytics';

// Chart Components
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Colors for charts
const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d'];

export default function AnalyticsDashboard() {
  const [filters, setFilters] = useState<FilterConfig>({
    dateRange: {
      from: subDays(new Date(), 29),
      to: new Date()
    },
    therapist: '',
    appointmentType: '',
    status: '',
    patientStatus: ''
  });

  // Data hooks
  const dateRangeForKPI = filters.dateRange 
    ? { start: filters.dateRange.from || subDays(new Date(), 29), end: filters.dateRange.to || new Date() }
    : { start: subDays(new Date(), 29), end: new Date() };
  
  const { data: kpiMetrics, isLoading: kpiLoading } = useKPIMetrics(dateRangeForKPI);
  const { data: financialData, isLoading: financialLoading } = useFinancialAnalytics(12);
  const { data: clinicalData, isLoading: clinicalLoading } = useClinicalAnalytics(12);
  const { data: operationalData, isLoading: operationalLoading } = useOperationalAnalytics();
  const { data: patientDistribution, isLoading: patientLoading } = usePatientDistribution();
  const { data: realtimeData } = useRealtimeMetrics();

  // Generate insights
  const insights = useMemo(() => {
    if (!operationalData) return [];
    return generateInsights({
      revenue: financialData,
      occupancyRate: operationalData.occupancyRate,
      noShowRate: operationalData.noShowRate
    });
  }, [financialData, operationalData]);

  const handleExport = () => {
    console.log('Exporting dashboard data...');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Dashboard de Analytics
            </h1>
            <p className="text-muted-foreground">
              Visão completa das métricas e insights da clínica
            </p>
          </div>
          <Button onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar Relatório
          </Button>
        </div>

        {/* Real-time Metrics Bar */}
        {realtimeData && (
          <Card className="bg-gradient-primary text-primary-foreground">
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{realtimeData.todayAppointments}</div>
                  <div className="text-sm opacity-90">Consultas Hoje</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{realtimeData.newPatients}</div>
                  <div className="text-sm opacity-90">Novos Pacientes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{realtimeData.activeSessions}</div>
                  <div className="text-sm opacity-90">Sessões Ativas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{realtimeData.onlineUsers}</div>
                  <div className="text-sm opacity-90">Usuários Online</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={() => window.location.reload()}
          onExport={handleExport}
          loading={kpiLoading}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpiMetrics?.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              change={metric.change}
              changeType={metric.changeType}
              icon={
                metric.icon === 'DollarSign' ? <DollarSign className="w-4 h-4" /> :
                metric.icon === 'Users' ? <Users className="w-4 h-4" /> :
                metric.icon === 'Calendar' ? <Calendar className="w-4 h-4" /> :
                metric.icon === 'Heart' ? <Heart className="w-4 h-4" /> :
                metric.icon === 'UserPlus' ? <Users className="w-4 h-4" /> :
                <Target className="w-4 h-4" />
              }
              loading={kpiLoading}
              gradient={index % 2 === 0}
            />
          ))}
        </div>

        {/* Insights Section */}
        {insights.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Insights Automáticos</h2>
              <Badge variant="secondary" className="text-xs">
                {insights.length} insight{insights.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map((insight, index) => (
                <InsightCard
                  key={index}
                  {...insight}
                  onDismiss={() => console.log('Dismiss insight', index)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tabs */}
        <Tabs defaultValue="financial" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="financial" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="clinical" className="gap-2">
              <Heart className="w-4 h-4" />
              Clínico
            </TabsTrigger>
            <TabsTrigger value="operational" className="gap-2">
              <Clock className="w-4 h-4" />
              Operacional
            </TabsTrigger>
            <TabsTrigger value="patients" className="gap-2">
              <Users className="w-4 h-4" />
              Pacientes
            </TabsTrigger>
          </TabsList>

          {/* Financial Analytics */}
          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartContainer
                title="Evolução de Receita"
                description="Receita dos últimos 12 meses"
                loading={financialLoading}
                insight="Crescimento de 15% em relação ao ano anterior"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [
                        new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(value),
                        'Receita'
                      ]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer
                title="Ticket Médio"
                description="Evolução do valor médio por compra"
                loading={financialLoading}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [
                        new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(value),
                        'Ticket Médio'
                      ]}
                    />
                    <Bar dataKey="avgTicket" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </TabsContent>

          {/* Clinical Analytics */}
          <TabsContent value="clinical" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartContainer
                title="Sessões de Tratamento"
                description="Volume de sessões por mês"
                loading={clinicalLoading}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clinicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sessions" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer
                title="Nível Médio de Dor"
                description="Evolução da dor dos pacientes"
                loading={clinicalLoading}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={clinicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="avgPainLevel" 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </TabsContent>

          {/* Operational Analytics */}
          <TabsContent value="operational" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Taxa de Ocupação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {operationalData?.occupancyRate || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Meta: 85%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Taxa de No-Show</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">
                    {operationalData?.noShowRate || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Meta: &lt; 10%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Horário de Pico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-secondary">
                    {operationalData?.peakHour || '09:00'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Maior movimento
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Patient Analytics */}
          <TabsContent value="patients" className="space-y-4">
            <ChartContainer
              title="Distribuição de Pacientes por Status"
              description="Status atual dos pacientes cadastrados"
              loading={patientLoading}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={patientDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {patientDistribution?.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}