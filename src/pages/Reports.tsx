import React, { useState, useCallback } from 'react';
import { logger } from '@/lib/errors/logger';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdvancedReportGenerator } from '@/components/reports/AdvancedReportGenerator';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Filter,
  Plus,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { useFinancial } from '@/hooks/useFinancial';

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  // Real data hooks
  const { data = [] } = useAppointments();
  const { data: patients = [] } = usePatients();
  const { activeTransactions, stats: finStats } = useFinancial();

  // Calculate real reports data
  const reportsData = {
    patients: {
      total: patients?.length || 0,
      newThisMonth: patients?.filter(p => new Date(p.created_at).getMonth() === new Date().getMonth()).length || 0,
      active: patients?.filter(p => p.status === 'Em Tratamento').length || 0,
      completed: patients?.filter(p => p.status === 'Alta').length || 0
    },
    appointments: {
      total: data?.length || 0,
      completed: data?.filter(a => a.status === 'concluido').length || 0,
      cancelled: data?.filter(a => a.status === 'cancelado').length || 0,
      noShow: data?.filter(a => a.status === 'falta').length || 0
    },
    financial: {
      revenue: finStats?.totalRevenue || 0,
      pending: finStats?.pendingPayments || 0,
      growth: finStats?.monthlyGrowth || 0
    }
  };

  const reportTemplates = [
    {
      id: 'patients-summary',
      name: 'Resumo de Pacientes',
      description: 'Relatório completo de pacientes ativos, novos e concluídos',
      icon: Users,
      category: 'Pacientes'
    },
    {
      id: 'financial-report',
      name: 'Relatório Financeiro',
      description: 'Análise financeira detalhada com receitas e pendências',
      icon: DollarSign,
      category: 'Financeiro'
    },
    {
      id: 'appointments-analysis',
      name: 'Análise de Agendamentos',
      description: 'Estatísticas de agendamentos, cancelamentos e comparecimento',
      icon: Calendar,
      category: 'Agendamentos'
    },
    {
      id: 'progress-report',
      name: 'Relatório de Progresso',
      description: 'Evolução dos pacientes e eficácia dos tratamentos',
      icon: TrendingUp,
      category: 'Tratamentos'
    },
    {
      id: 'activity-summary',
      name: 'Resumo de Atividades',
      description: 'Visão geral das atividades da clínica',
      icon: Activity,
      category: 'Geral'
    }
  ];

  const recentReports = [
    {
      id: 1,
      name: 'Relatório Mensal - Janeiro 2024',
      type: 'Financeiro',
      generatedAt: new Date('2024-01-31'),
      status: 'Concluído'
    },
    {
      id: 2,
      name: 'Análise de Pacientes - Q4 2023',
      type: 'Pacientes',
      generatedAt: new Date('2024-01-15'),
      status: 'Concluído'
    },
    {
      id: 3,
      name: 'Resumo de Agendamentos - Dezembro',
      type: 'Agendamentos',
      generatedAt: new Date('2024-01-02'),
      status: 'Concluído'
    }
  ];

  const generateReport = useCallback((templateId: string) => {
    logger.info('Gerando relatório', { templateId }, 'Reports');
    setSelectedReport(templateId);
    // Simular geração de relatório
    setTimeout(() => {
      alert('Relatório gerado com sucesso!');
      setSelectedReport(null);
    }, 2000);
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'Concluído':
        return 'bg-green-100 text-green-800';
      case 'Processando':
        return 'bg-yellow-100 text-yellow-800';
      case 'Erro':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              Relatórios
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Análises e relatórios detalhados da clínica
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button variant="outline" size="sm" className="hover:bg-accent/80 border-border/50 flex-1 sm:flex-none">
              <Filter className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
            <Button size="sm" className="bg-gradient-primary hover:bg-gradient-primary/90 shadow-medical flex-1 sm:flex-none">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Relatório</span>
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="order-2 sm:order-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Pacientes</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{reportsData.patients.total}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-medical order-1 sm:order-2">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Agendamentos</p>
                  <p className="text-2xl font-bold text-foreground">{reportsData.appointments.total}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center shadow-medical">
                  <Calendar className="w-6 h-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receita Mensal</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {reportsData.financial.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-medical">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Crescimento</p>
                  <p className="text-2xl font-bold text-secondary">+{reportsData.financial.growth}%</p>
                </div>
                <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center shadow-medical">
                  <TrendingUp className="w-6 h-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="templates" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="templates" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Modelos de Relatório</span>
              <span className="sm:hidden">Modelos</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Gerador Avançado</span>
              <span className="sm:hidden">Avançado</span>
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Relatórios Recentes</span>
              <span className="sm:hidden">Recentes</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="advanced" className="space-y-6">
            <AdvancedReportGenerator />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            {/* Period Selector */}
            <Card className="bg-gradient-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gradient-primary/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">Período:</span>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-48 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Esta Semana</SelectItem>
                      <SelectItem value="month">Este Mês</SelectItem>
                      <SelectItem value="quarter">Este Trimestre</SelectItem>
                      <SelectItem value="year">Este Ano</SelectItem>
                      <SelectItem value="custom">Período Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Report Templates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {reportTemplates.map((template) => {
                const IconComponent = template.icon;
                const isGenerating = selectedReport === template.id;

                return (
                  <Card
                    key={template.id}
                    className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300 group cursor-pointer"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-primary/10 rounded-lg flex items-center justify-center group-hover:bg-gradient-primary/20 transition-colors">
                            <IconComponent className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>

                      <Button
                        className="w-full bg-gradient-primary hover:bg-gradient-primary/90"
                        onClick={() => generateReport(template.id)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Gerar Relatório
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Relatórios Recentes
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Buscar relatórios..."
                      className="pl-10 w-64"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{report.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {report.type} • {format(report.generatedAt, 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log('Downloading report:', report.name);
                            alert(`Baixando: ${report.name}`);
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Agendamentos por Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Concluídos', value: reportsData.appointments.completed },
                      { name: 'Cancelados', value: reportsData.appointments.cancelled },
                      { name: 'Faltas', value: reportsData.appointments.noShow },
                      { name: 'Agendados', value: reportsData.appointments.total - (reportsData.appointments.completed + reportsData.appointments.cancelled + reportsData.appointments.noShow) }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'white', borderRadius: '8px' }}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                        {
                          [
                            { name: 'Concluídos', color: '#10B981' },
                            { name: 'Cancelados', color: '#F59E0B' },
                            { name: 'Faltas', color: '#EF4444' },
                            { name: 'Agendados', color: '#3B82F6' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Status dos Pacientes
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Em Tratamento', value: reportsData.patients.active },
                          { name: 'Alta', value: reportsData.patients.completed },
                          { name: 'Inativos', value: reportsData.patients.total - (reportsData.patients.active + reportsData.patients.completed) }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          { color: '#3B82F6' },
                          { color: '#10B981' },
                          { color: '#94A3B8' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5" />
                    Receita Recente (Últimas Transações)
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeTransactions
                      ?.filter(t => t.tipo === 'receita')
                      .slice(0, 10)
                      .map(t => ({
                        date: format(new Date(t.data_create), 'dd/MM'),
                        amount: Number(t.valor)
                      }))
                      .reverse() || []
                    }>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                      <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Reports;