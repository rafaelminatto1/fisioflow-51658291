import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  DollarSign,
  Calendar,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Settings,
  Download,
  Upload,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Filter,
  Calendar as CalendarIcon,
  Lightbulb,
  Target,
  Zap,
  Brain
} from 'lucide-react';
import { useAdvancedAnalytics, formatMetricValue, getChangeColor, getChangeIcon, getConfidenceColor, getImpactColor, getStatusColor } from '@/hooks/useAdvancedAnalytics';

// Componentes auxiliares
const MetricCard: React.FC<{ metric: any }> = ({ metric }) => {
  const changeColor = getChangeColor(metric.changeType);
  const changeIcon = getChangeIcon(metric.changeType);
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {metric.category === 'patients' && <Users className="h-4 w-4" />}
          {metric.category === 'revenue' && <DollarSign className="h-4 w-4" />}
          {metric.category === 'appointments' && <Calendar className="h-4 w-4" />}
          {metric.category === 'performance' && <Activity className="h-4 w-4" />}
          {metric.category === 'satisfaction' && <Star className="h-4 w-4" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatMetricValue(metric.value, metric.unit)}</div>
        <div className={`text-xs flex items-center ${changeColor}`}>
          <span className="mr-1">{changeIcon}</span>
          {Math.abs(metric.change).toFixed(1)}% em relação ao período anterior
        </div>
        <p className="text-xs text-muted-foreground mt-2">{metric.description}</p>
      </CardContent>
    </Card>
  );
};

const InsightCard: React.FC<{ insight: any }> = ({ insight }) => {
  const confidenceColor = getConfidenceColor(insight.confidence);
  const impactColor = getImpactColor(insight.impact);
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center">
            {insight.type === 'trend' && <TrendingUp className="h-4 w-4 mr-2" />}
            {insight.type === 'anomaly' && <AlertTriangle className="h-4 w-4 mr-2" />}
            {insight.type === 'forecast' && <Brain className="h-4 w-4 mr-2" />}
            {insight.type === 'recommendation' && <Lightbulb className="h-4 w-4 mr-2" />}
            {insight.title}
          </CardTitle>
          <div className="flex space-x-2">
            <Badge variant="outline" className={impactColor}>
              {insight.impact}
            </Badge>
            <Badge variant="outline" className={confidenceColor}>
              {insight.confidence}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
        {insight.actionable && insight.suggestedActions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Ações Sugeridas:</Label>
            <ul className="text-xs space-y-1">
              {insight.suggestedActions.map((action: string, index: number) => (
                <li key={index} className="flex items-center">
                  <Target className="h-3 w-3 mr-2 text-blue-500" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const RealtimeMetricCard: React.FC<{ metric: any }> = ({ metric }) => {
  const statusColor = getStatusColor(metric.status);
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
        <div className={`h-2 w-2 rounded-full ${metric.status === 'normal' ? 'bg-green-500' : metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metric.value.toFixed(0)}</div>
        <div className={`text-xs ${statusColor}`}>
          Status: {metric.status === 'normal' ? 'Normal' : metric.status === 'warning' ? 'Atenção' : 'Crítico'}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Atualizado: {metric.timestamp.toLocaleTimeString('pt-BR')}
        </p>
      </CardContent>
    </Card>
  );
};

const ChartWidget: React.FC<{ widget: any; data: any[] }> = ({ widget, data }) => {
  const renderChart = () => {
    const chartData = data.slice(-30); // Últimos 30 pontos
    
    switch (widget.config.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={widget.config.height || 300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={widget.config.dataKey} 
                stroke={widget.config.color} 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={widget.config.height || 300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={widget.config.dataKey} fill={widget.config.color} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={widget.config.height || 300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey={widget.config.dataKey} 
                stroke={widget.config.color} 
                fill={widget.config.color}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={widget.config.height || 300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill={widget.config.color}
                dataKey={widget.config.dataKey}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return <div className="flex items-center justify-center h-64 text-muted-foreground">Tipo de gráfico não suportado</div>;
    }
  };
  
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          {widget.config.type === 'line' && <LineChartIcon className="h-4 w-4 mr-2" />}
          {widget.config.type === 'bar' && <BarChart3 className="h-4 w-4 mr-2" />}
          {widget.config.type === 'pie' && <PieChartIcon className="h-4 w-4 mr-2" />}
          {widget.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
};

const DashboardBuilder: React.FC<{ onSave: (dashboard: any) => void }> = ({ onSave }) => {
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [widgets, setWidgets] = useState<any[]>([]);
  
  const addWidget = (type: string) => {
    const newWidget = {
      id: `widget-${Date.now()}`,
      type,
      title: `Novo ${type === 'metric' ? 'Métrica' : type === 'chart' ? 'Gráfico' : 'Widget'}`,
      position: { x: 0, y: widgets.length * 4, w: type === 'metric' ? 3 : 6, h: 4 },
      config: type === 'chart' ? { type: 'line', dataKey: 'value', color: '#0ea5e9' } : {},
      isVisible: true
    };
    
    setWidgets(prev => [...prev, newWidget]);
  };
  
  const removeWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  };
  
  const handleSave = () => {
    if (!dashboardName.trim()) {
      toast.error('Nome do dashboard é obrigatório');
      return;
    }
    
    const dashboard = {
      name: dashboardName,
      description: dashboardDescription,
      widgets,
      isDefault: false,
      userId: 'current-user',
      isPublic: false
    };
    
    onSave(dashboard);
    toast.success('Dashboard criado com sucesso!');
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="dashboard-name">Nome do Dashboard</Label>
          <Input
            id="dashboard-name"
            value={dashboardName}
            onChange={(e) => setDashboardName(e.target.value)}
            placeholder="Ex: Dashboard de Vendas"
          />
        </div>
        
        <div>
          <Label htmlFor="dashboard-description">Descrição</Label>
          <Input
            id="dashboard-description"
            value={dashboardDescription}
            onChange={(e) => setDashboardDescription(e.target.value)}
            placeholder="Descrição opcional do dashboard"
          />
        </div>
      </div>
      
      <Separator />
      
      <div>
        <Label className="text-base font-medium">Widgets</Label>
        <div className="flex space-x-2 mt-2">
          <Button variant="outline" size="sm" onClick={() => addWidget('metric')}>
            <Activity className="h-4 w-4 mr-2" />
            Métrica
          </Button>
          <Button variant="outline" size="sm" onClick={() => addWidget('chart')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Gráfico
          </Button>
        </div>
        
        <div className="mt-4 space-y-2">
          {widgets.map((widget) => (
            <div key={widget.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <span className="font-medium">{widget.title}</span>
                <span className="text-sm text-muted-foreground ml-2">({widget.type})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeWidget(widget.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          {widgets.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum widget adicionado. Clique nos botões acima para adicionar widgets.
            </p>
          )}
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline">Cancelar</Button>
        <Button onClick={handleSave}>Salvar Dashboard</Button>
      </div>
    </div>
  );
};

export const AdvancedAnalytics: React.FC = () => {
  const {
    metrics,
    insights,
    realtimeMetrics,
    dashboards,
    currentDashboard,
    insightsByImpact,
    activeDashboard,
    filters,
    loading,
    error,
    setActiveDashboard,
    refreshMetrics,
    updateFilters,
    generateInsights,
    createDashboard,
    deleteDashboard,
    duplicateDashboard,
    exportDashboard,
    importDashboard,
    getMetricsByCategory,
    getTopPerformingMetrics,
    calculateTotalChange
  } = useAdvancedAnalytics();
  
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Mock data para gráficos
  const chartData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    revenue: 75000 + Math.random() * 20000,
    patients: 1200 + Math.random() * 100,
    appointments: 150 + Math.random() * 50,
    satisfaction: 4.2 + Math.random() * 0.8
  }));
  
  const handleDateRangeChange = (range: string) => {
    setSelectedDateRange(range);
    const now = new Date();
    let start: Date;
    
    switch (range) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    updateFilters({ dateRange: { start, end: now } });
  };
  
  const handleCategoryFilter = (categories: string[]) => {
    setSelectedCategories(categories);
    updateFilters({ categories });
  };
  
  const handleExportDashboard = () => {
    const exported = exportDashboard(activeDashboard);
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${activeDashboard}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Dashboard exportado com sucesso!');
  };
  
  const handleImportDashboard = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const imported = importDashboard(content);
      if (imported) {
        toast.success('Dashboard importado com sucesso!');
      }
    };
    reader.readAsText(file);
  };
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Erro ao carregar analytics</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={refreshMetrics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Avançados</h1>
          <p className="text-muted-foreground">
            Dashboards personalizáveis e insights inteligentes para sua clínica
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          
          <Button variant="outline" size="sm" onClick={refreshMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Configurações do Dashboard</SheetTitle>
                <SheetDescription>
                  Gerencie seus dashboards e configurações de analytics
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-6 mt-6">
                <div>
                  <Label className="text-base font-medium">Dashboard Ativo</Label>
                  <Select value={activeDashboard} onValueChange={setActiveDashboard}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dashboards.map((dashboard) => (
                        <SelectItem key={dashboard.id} value={dashboard.id}>
                          {dashboard.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleExportDashboard}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                  
                  <Button variant="outline" size="sm" asChild>
                    <label>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImportDashboard}
                      />
                    </label>
                  </Button>
                  
                  <Button variant="outline" size="sm" onClick={() => duplicateDashboard(activeDashboard)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </Button>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Dashboard
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Dashboard</DialogTitle>
                      <DialogDescription>
                        Configure seu dashboard personalizado com widgets e métricas
                      </DialogDescription>
                    </DialogHeader>
                    <DashboardBuilder onSave={createDashboard} />
                  </DialogContent>
                </Dialog>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Período</Label>
                <Select value={selectedDateRange} onValueChange={handleDateRangeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="90d">Últimos 90 dias</SelectItem>
                    <SelectItem value="1y">Último ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Categorias</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patients">Pacientes</SelectItem>
                    <SelectItem value="revenue">Receita</SelectItem>
                    <SelectItem value="appointments">Consultas</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="satisfaction">Satisfação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button variant="outline" onClick={() => setShowFilters(false)}>
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="realtime">Tempo Real</TabsTrigger>
          <TabsTrigger value="custom">Dashboard Personalizado</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getTopPerformingMetrics(4).map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
          
          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartWidget
              widget={{
                title: 'Evolução da Receita',
                config: { type: 'line', dataKey: 'revenue', color: '#0ea5e9', height: 300 }
              }}
              data={chartData}
            />
            
            <ChartWidget
              widget={{
                title: 'Crescimento de Pacientes',
                config: { type: 'area', dataKey: 'patients', color: '#10b981', height: 300 }
              }}
              data={chartData}
            />
          </div>
          
          {/* Resumo de Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Performance</CardTitle>
              <CardDescription>
                Variação média geral: {calculateTotalChange().toFixed(1)}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries({
                  patients: getMetricsByCategory('patients'),
                  revenue: getMetricsByCategory('revenue'),
                  performance: getMetricsByCategory('performance')
                }).map(([category, categoryMetrics]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium capitalize">{category}</h4>
                    {categoryMetrics.slice(0, 2).map((metric) => (
                      <div key={metric.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{metric.name}</span>
                        <span className={getChangeColor(metric.changeType)}>
                          {getChangeIcon(metric.changeType)} {Math.abs(metric.change).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Insights Inteligentes</h2>
              <p className="text-muted-foreground">Análises automáticas e recomendações baseadas em IA</p>
            </div>
            
            <Button onClick={generateInsights} disabled={loading}>
              <Brain className="h-4 w-4 mr-2" />
              Gerar Novos Insights
            </Button>
          </div>
          
          {/* Insights por Impacto */}
          <div className="space-y-6">
            {Object.entries(insightsByImpact).map(([impact, impactInsights]) => (
              impactInsights.length > 0 && (
                <div key={impact}>
                  <h3 className="text-lg font-semibold mb-4 capitalize flex items-center">
                    {impact === 'high' && <Zap className="h-5 w-5 mr-2 text-red-500" />}
                    {impact === 'medium' && <Target className="h-5 w-5 mr-2 text-yellow-500" />}
                    {impact === 'low' && <CheckCircle className="h-5 w-5 mr-2 text-green-500" />}
                    Impacto {impact === 'high' ? 'Alto' : impact === 'medium' ? 'Médio' : 'Baixo'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {impactInsights.map((insight) => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
          
          {insights.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum insight disponível</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Clique em "Gerar Novos Insights" para analisar seus dados e receber recomendações inteligentes.
                </p>
                <Button onClick={generateInsights} disabled={loading}>
                  <Brain className="h-4 w-4 mr-2" />
                  Gerar Insights
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="realtime" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Monitoramento em Tempo Real</h2>
            <p className="text-muted-foreground">Acompanhe métricas importantes em tempo real</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {realtimeMetrics.map((metric) => (
              <RealtimeMetricCard key={metric.id} metric={metric} />
            ))}
          </div>
          
          {/* Gráfico de Tempo Real */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade em Tempo Real</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="appointments" stroke="#0ea5e9" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="custom" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">{currentDashboard.name}</h2>
            <p className="text-muted-foreground">{currentDashboard.description}</p>
          </div>
          
          {/* Widgets do Dashboard Personalizado */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentDashboard.widgets
              .filter(widget => widget.isVisible)
              .map((widget) => {
                if (widget.type === 'metric') {
                  const widgetMetrics = widget.config.metrics || [];
                  return (
                    <div key={widget.id} className="space-y-4">
                      {widgetMetrics.map((metricId: string) => {
                        const metric = metrics.find(m => m.id === metricId);
                        return metric ? <MetricCard key={metric.id} metric={metric} /> : null;
                      })}
                    </div>
                  );
                }
                
                if (widget.type === 'chart') {
                  return (
                    <div key={widget.id} className="col-span-full">
                      <ChartWidget widget={widget} data={chartData} />
                    </div>
                  );
                }
                
                return null;
              })
            }
          </div>
          
          {currentDashboard.widgets.filter(w => w.isVisible).length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Dashboard vazio</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Este dashboard não possui widgets configurados. Use as configurações para adicionar widgets.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalytics;