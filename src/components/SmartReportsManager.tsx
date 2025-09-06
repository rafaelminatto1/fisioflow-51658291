import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Download, 
  Share2, 
  TrendingUp, 
  Calendar, 
  User, 
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Brain,
  Target,
  Award
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';

interface SmartReportsManagerProps {
  selectedPatientId?: string;
  selectedPlanId?: string;
}

const SmartReportsManager: React.FC<SmartReportsManagerProps> = ({
  selectedPatientId,
  selectedPlanId
}) => {
  const { patients, exercisePlans, patientProgress } = useData();
  const { toast } = useToast();
  const [reportType, setReportType] = useState('progress');
  const [dateRange, setDateRange] = useState('30');
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const selectedPlan = exercisePlans.find(p => p.id === selectedPlanId);
  const patientProgressData = patientProgress.filter(p => p.patient_id === selectedPatientId);

  const handleGenerateReport = async () => {
    if (!selectedPatientId) {
      toast({
        title: "Erro",
        description: "Selecione um paciente para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simular geração de relatório
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Sucesso",
        description: "Relatório gerado com sucesso!",
      });
    }, 2000);
  };

  const handleDownloadReport = () => {
    toast({
      title: "Download iniciado",
      description: "O relatório será baixado em breve.",
    });
  };

  const handleShareReport = () => {
    toast({
      title: "Compartilhamento",
      description: "Link de compartilhamento copiado para a área de transferência.",
    });
  };

  const getProgressSummary = () => {
    if (patientProgressData.length === 0) return null;

    const latest = patientProgressData[patientProgressData.length - 1];
    const first = patientProgressData[0];
    
    return {
      painImprovement: first.pain_level - latest.pain_level,
      functionalImprovement: latest.functional_score - first.functional_score,
      averageCompliance: patientProgressData.reduce((acc, p) => acc + p.exercise_compliance, 0) / patientProgressData.length
    };
  };

  const progressSummary = getProgressSummary();

  if (!selectedPatientId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Relatórios Inteligentes</h3>
          <p className="text-muted-foreground">
            Selecione um paciente para gerar relatórios personalizados com insights de IA.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatórios Inteligentes</h2>
          <p className="text-muted-foreground">
            Relatórios automatizados com análises de IA para {selectedPatient?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerateReport} 
            disabled={isGenerating}
            className="bg-primary hover:bg-primary/90"
          >
            <Brain className="w-4 h-4 mr-2" />
            {isGenerating ? 'Gerando...' : 'Gerar Relatório IA'}
          </Button>
          <Button variant="outline" onClick={handleDownloadReport}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" onClick={handleShareReport}>
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Configuração do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Relatório</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="progress">Relatório de Progresso</SelectItem>
                  <SelectItem value="compliance">Análise de Aderência</SelectItem>
                  <SelectItem value="outcomes">Resultados Clínicos</SelectItem>
                  <SelectItem value="comprehensive">Relatório Completo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 3 meses</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Formato</label>
              <Select defaultValue="pdf">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="word">Word</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      {progressSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Melhora na Dor</p>
                  <p className="text-2xl font-bold text-green-600">
                    {progressSummary.painImprovement > 0 ? '-' : '+'}{Math.abs(progressSummary.painImprovement)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Melhora Funcional</p>
                  <p className="text-2xl font-bold text-blue-600">
                    +{progressSummary.functionalImprovement}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aderência Média</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(progressSummary.averageCompliance)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Prévia do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="progress">Progresso</TabsTrigger>
              <TabsTrigger value="insights">Insights IA</TabsTrigger>
              <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Informações do Paciente</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Nome:</span> {selectedPatient?.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedPatient?.email}</p>
                    <p><span className="font-medium">Telefone:</span> {selectedPatient?.phone}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Plano Atual</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Nome:</span> {selectedPlan?.name || 'Nenhum plano ativo'}</p>
                    <p><span className="font-medium">Status:</span> 
                      <Badge variant="outline" className="ml-2">
                        {selectedPlan?.status || 'N/A'}
                      </Badge>
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="progress" className="space-y-4">
              <div className="text-center p-8 bg-muted/50 rounded-lg">
                <LineChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Gráficos de progresso serão exibidos aqui
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="insights" className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Insight de IA</span>
                  </div>
                  <p className="text-sm text-blue-800">
                    O paciente demonstra excelente aderência ao tratamento com melhora consistente nos indicadores funcionais.
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-900">Tendência Positiva</span>
                  </div>
                  <p className="text-sm text-green-800">
                    Redução significativa no nível de dor nas últimas 4 semanas, indicando resposta favorável ao tratamento.
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="recommendations" className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium mb-2">Recomendações Clínicas</h5>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Manter frequência atual de exercícios</li>
                    <li>• Considerar progressão de carga em 10-15%</li>
                    <li>• Incluir exercícios de propriocepção</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium mb-2">Próximos Passos</h5>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Reavaliação em 2 semanas</li>
                    <li>• Ajuste do plano baseado na evolução</li>
                    <li>• Monitoramento contínuo da aderência</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartReportsManager;