import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  BarChart3
} from 'lucide-react';
import { useSmartReports, type AdherenceReport, type ProgressReport, type ReportFilters } from '@/hooks/useSmartReports';
import { usePatients } from '@/hooks/usePatients';
import { useExercisePlans } from '@/hooks/useExercisePlans';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SmartReportsManagerProps {
  selectedPatientId?: string;
  selectedPlanId?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const SmartReportsManager: React.FC<SmartReportsManagerProps> = ({
  selectedPatientId,
  selectedPlanId
}) => {
  const {
    adherenceReports,
    progressReports,
    loading,
    error,
    fetchAdherenceReports,
    fetchProgressReports,
    generateAdherenceReport,
    generateProgressReport,
    exportReport
  } = useSmartReports();
  
  const { patients } = usePatients();
  const { exercisePlans } = useExercisePlans();
  
  const [filters, setFilters] = useState<ReportFilters>({
    patient_id: selectedPatientId,
    plan_id: selectedPlanId,
    report_type: 'both'
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (filters.report_type === 'adherence' || filters.report_type === 'both') {
      fetchAdherenceReports(filters);
    }
    if (filters.report_type === 'progress' || filters.report_type === 'both') {
      fetchProgressReports(filters);
    }
  }, [filters]);

  const handleGenerateAdherenceReport = async () => {
    if (!filters.patient_id || !filters.plan_id) return;
    
    setGeneratingReport(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1); // Last month
      
      await generateAdherenceReport(
        filters.patient_id,
        filters.plan_id,
        startDate.toISOString(),
        endDate.toISOString()
      );
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleGenerateProgressReport = async (reportType: 'weekly' | 'monthly' | 'custom') => {
    if (!filters.patient_id || !filters.plan_id) return;
    
    setGeneratingReport(true);
    try {
      await generateProgressReport(filters.patient_id, filters.plan_id, reportType);
    } finally {
      setGeneratingReport(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'worsening':
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-50';
      case 'worsening':
      case 'declining':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getAdherenceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Prepare chart data
  const adherenceChartData = adherenceReports.slice(0, 10).reverse().map(report => ({
    date: format(new Date(report.created_at), 'dd/MM', { locale: ptBR }),
    aderencia: report.adherence_percentage,
    dor: report.average_pain_level,
    funcionalidade: report.average_functional_score
  }));

  const progressMetricsData = progressReports.slice(0, 5).map(report => ({
    tipo: report.report_type === 'weekly' ? 'Semanal' : report.report_type === 'monthly' ? 'Mensal' : 'Personalizado',
    dor: report.metrics.pain_improvement,
    funcionalidade: report.metrics.functional_improvement,
    aderencia: report.metrics.exercise_compliance
  }));

  const adherenceDistribution = [
    { name: 'Alta (≥80%)', value: adherenceReports.filter(r => r.adherence_percentage >= 80).length, color: '#00C49F' },
    { name: 'Média (60-79%)', value: adherenceReports.filter(r => r.adherence_percentage >= 60 && r.adherence_percentage < 80).length, color: '#FFBB28' },
    { name: 'Baixa (<60%)', value: adherenceReports.filter(r => r.adherence_percentage < 60).length, color: '#FF8042' }
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Relatórios Inteligentes
          </CardTitle>
          <CardDescription>
            Análise detalhada de aderência e progresso dos pacientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient-select">Paciente</Label>
              <Select
                value={filters.patient_id || ''}
                onValueChange={(value) => setFilters(prev => ({ ...prev, patient_id: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os pacientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os pacientes</SelectItem>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="plan-select">Plano</Label>
              <Select
                value={filters.plan_id || ''}
                onValueChange={(value) => setFilters(prev => ({ ...prev, plan_id: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os planos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os planos</SelectItem>
                  {exercisePlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date-from">Data Inicial</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value || undefined }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date-to">Data Final</Label>
              <Input
                id="date-to"
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value || undefined }))}
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleGenerateAdherenceReport}
              disabled={!filters.patient_id || !filters.plan_id || generatingReport}
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Gerar Relatório de Aderência
            </Button>
            
            <Button
              onClick={() => handleGenerateProgressReport('monthly')}
              disabled={!filters.patient_id || !filters.plan_id || generatingReport}
              variant="outline"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Gerar Relatório de Progresso
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="adherence">Aderência</TabsTrigger>
          <TabsTrigger value="progress">Progresso</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Relatórios</p>
                    <p className="text-2xl font-bold">{adherenceReports.length + progressReports.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Aderência Média</p>
                    <p className="text-2xl font-bold">
                      {adherenceReports.length > 0 
                        ? Math.round(adherenceReports.reduce((sum, r) => sum + r.adherence_percentage, 0) / adherenceReports.length)
                        : 0}%
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pacientes Ativos</p>
                    <p className="text-2xl font-bold">
                      {new Set([...adherenceReports.map(r => r.patient_id), ...progressReports.map(r => r.patient_id)]).size}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Último Relatório</p>
                    <p className="text-sm font-bold">
                      {adherenceReports.length > 0 || progressReports.length > 0
                        ? format(
                            new Date(Math.max(
                              ...adherenceReports.map(r => new Date(r.created_at).getTime()),
                              ...progressReports.map(r => new Date(r.created_at).getTime())
                            )),
                            'dd/MM/yyyy',
                            { locale: ptBR }
                          )
                        : 'Nenhum'
                      }
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Evolução da Aderência</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={adherenceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="aderencia" stroke="#8884d8" name="Aderência (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Aderência</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={adherenceDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {adherenceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Adherence Tab */}
        <TabsContent value="adherence" className="space-y-4">
          <div className="grid gap-4">
            {adherenceReports.map((report) => {
              const patient = patients.find(p => p.id === report.patient_id);
              const plan = exercisePlans.find(p => p.id === report.plan_id);
              
              return (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {patient?.name} - {plan?.name}
                        </CardTitle>
                        <CardDescription>
                          {format(new Date(report.period_start), 'dd/MM/yyyy', { locale: ptBR })} - {' '}
                          {format(new Date(report.period_end), 'dd/MM/yyyy', { locale: ptBR })}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportReport(report.id, 'adherence', 'pdf')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportReport(report.id, 'adherence', 'csv')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          CSV
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Aderência</p>
                        <p className={`text-2xl font-bold ${getAdherenceColor(report.adherence_percentage)}`}>
                          {report.adherence_percentage}%
                        </p>
                        <Progress value={report.adherence_percentage} className="mt-2" />
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Dor Média</p>
                        <p className="text-2xl font-bold">{report.average_pain_level}/10</p>
                        <Progress value={report.average_pain_level * 10} className="mt-2" />
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Funcionalidade</p>
                        <p className="text-2xl font-bold">{report.average_functional_score}/10</p>
                        <Progress value={report.average_functional_score * 10} className="mt-2" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Exercícios</p>
                        <p className="text-sm text-muted-foreground">
                          {report.completed_exercises} de {report.total_exercises} exercícios completados
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-2">Score de Progressão</p>
                        <p className="text-sm text-muted-foreground">
                          {report.progression_score > 0 ? '+' : ''}{report.progression_score}%
                        </p>
                      </div>
                    </div>
                    
                    {report.recommendations.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Recomendações</p>
                        <div className="space-y-1">
                          {report.recommendations.map((rec, index) => (
                            <Badge key={index} variant="outline" className="mr-2 mb-1">
                              {rec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          <div className="grid gap-4">
            {progressReports.map((report) => {
              const patient = patients.find(p => p.id === report.patient_id);
              const plan = exercisePlans.find(p => p.id === report.plan_id);
              
              return (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {patient?.name} - {plan?.name}
                        </CardTitle>
                        <CardDescription>
                          Relatório {report.report_type === 'weekly' ? 'Semanal' : report.report_type === 'monthly' ? 'Mensal' : 'Personalizado'} - {' '}
                          {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportReport(report.id, 'progress', 'pdf')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        {getTrendIcon(report.trends.pain_trend)}
                        <div>
                          <p className="text-sm text-muted-foreground">Tendência da Dor</p>
                          <Badge className={getTrendColor(report.trends.pain_trend)}>
                            {report.trends.pain_trend === 'improving' ? 'Melhorando' : 
                             report.trends.pain_trend === 'worsening' ? 'Piorando' : 'Estável'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getTrendIcon(report.trends.function_trend)}
                        <div>
                          <p className="text-sm text-muted-foreground">Tendência Funcional</p>
                          <Badge className={getTrendColor(report.trends.function_trend)}>
                            {report.trends.function_trend === 'improving' ? 'Melhorando' : 
                             report.trends.function_trend === 'worsening' ? 'Piorando' : 'Estável'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getTrendIcon(report.trends.adherence_trend)}
                        <div>
                          <p className="text-sm text-muted-foreground">Tendência de Aderência</p>
                          <Badge className={getTrendColor(report.trends.adherence_trend)}>
                            {report.trends.adherence_trend === 'improving' ? 'Melhorando' : 
                             report.trends.adherence_trend === 'declining' ? 'Declinando' : 'Estável'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Melhora da Dor</p>
                        <p className="text-lg font-bold">{report.metrics.pain_improvement}%</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Melhora Funcional</p>
                        <p className="text-lg font-bold">{report.metrics.functional_improvement}%</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Aderência</p>
                        <p className="text-lg font-bold">{report.metrics.exercise_compliance}%</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Frequência</p>
                        <p className="text-lg font-bold">{report.metrics.session_frequency}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Meta Alcançada</p>
                        <p className="text-lg font-bold">{report.metrics.goal_achievement}%</p>
                      </div>
                    </div>
                    
                    {report.insights.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Insights
                        </p>
                        <div className="space-y-1">
                          {report.insights.map((insight, index) => (
                            <p key={index} className="text-sm text-muted-foreground">
                              • {insight}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {report.recommendations.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Recomendações
                        </p>
                        <div className="space-y-1">
                          {report.recommendations.map((rec, index) => (
                            <Badge key={index} variant="outline" className="mr-2 mb-1">
                              {rec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Progresso</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={progressMetricsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipo" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="dor" fill="#8884d8" name="Melhora da Dor (%)" />
                  <Bar dataKey="funcionalidade" fill="#82ca9d" name="Melhora Funcional (%)" />
                  <Bar dataKey="aderencia" fill="#ffc658" name="Aderência (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Correlação Dor vs Funcionalidade</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={adherenceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="dor" stroke="#ff7300" name="Nível de Dor" />
                  <Line type="monotone" dataKey="funcionalidade" stroke="#387908" name="Score Funcional" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartReportsManager;