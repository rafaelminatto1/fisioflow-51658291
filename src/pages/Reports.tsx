import React, { useState } from 'react';
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
  Search,
  Plus,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EmptyState, LoadingSkeleton } from '@/components/ui';

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  // Mock data para relatórios
  const reportsData = {
    patients: {
      total: 156,
      newThisMonth: 23,
      active: 142,
      completed: 14
    },
    appointments: {
      total: 342,
      completed: 318,
      cancelled: 24,
      noShow: 12
    },
    financial: {
      revenue: 18750.00,
      pending: 2340.00,
      growth: 15.3
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

  const generateReport = (templateId: string) => {
    console.log('Generating report:', templateId);
    setSelectedReport(templateId);
    // Simular geração de relatório
    setTimeout(() => {
      alert('Relatório gerado com sucesso!');
      setSelectedReport(null);
    }, 2000);
  };

  const getStatusColor = (status: string) => {
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
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Relatórios
            </h1>
            <p className="text-muted-foreground">
              Análises e relatórios detalhados da clínica
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="hover:bg-accent/80 border-border/50">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <Button className="bg-gradient-primary hover:bg-gradient-primary/90 shadow-medical">
              <Plus className="w-4 h-4 mr-2" />
              Novo Relatório
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Pacientes</p>
                  <p className="text-2xl font-bold text-foreground">{reportsData.patients.total}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-medical">
                  <Users className="w-6 h-6 text-primary-foreground" />
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
        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="templates">Modelos de Relatório</TabsTrigger>
            <TabsTrigger value="advanced">Gerador Avançado</TabsTrigger>
            <TabsTrigger value="recent">Relatórios Recentes</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    Agendamentos por Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={BarChart3}
                    title="Gráfico em desenvolvimento"
                    description="Visualização de dados será implementada em breve"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Distribuição por Tipo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={PieChart}
                    title="Gráfico em desenvolvimento"
                    description="Visualização de dados será implementada em breve"
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5" />
                    Evolução da Receita
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={LineChart}
                    title="Gráfico em desenvolvimento"
                    description="Visualização de dados será implementada em breve"
                  />
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