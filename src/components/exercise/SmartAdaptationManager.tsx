import React, { useState, useEffect } from 'react';
import { useSmartAdaptation } from '@/hooks/useSmartAdaptation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  CheckCircle, 
  XCircle, 
  Activity,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface SmartAdaptationManagerProps {
  patientId: string;
  exercisePlanId?: string;
}

export default function SmartAdaptationManager({ 
  patientId
}: SmartAdaptationManagerProps) {
  const {
    rules,
    suggestions,
    loading,
    error,
    fetchRules,
    analyzePatientMetrics,
    applySuggestion,
    rejectSuggestion
  } = useSmartAdaptation();

  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleAnalyzeMetrics = async () => {
    try {
      setAnalyzing(true);
      const newSuggestions = await analyzePatientMetrics(patientId);
      
      if (newSuggestions.length > 0) {
        toast.success(`${newSuggestions.length} nova(s) sugestão(ões) gerada(s)`);
      } else {
        toast.info('Nenhuma adaptação necessária no momento');
      }
    } catch {
      toast.error('Erro ao analisar métricas do paciente');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    try {
      await applySuggestion(suggestionId);
      toast.success('Adaptação aplicada com sucesso');
    } catch {
      toast.error('Erro ao aplicar adaptação');
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      await rejectSuggestion(suggestionId);
      toast.success('Sugestão rejeitada');
    } catch {
      toast.error('Erro ao rejeitar sugestão');
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceText = (score: number) => {
    if (score >= 0.8) return 'Alta';
    if (score >= 0.6) return 'Média';
    return 'Baixa';
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'exercise_modification':
        return <Target className="h-5 w-5 text-blue-600" />;
      case 'plan_adjustment':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'frequency_change':
        return <Activity className="h-5 w-5 text-orange-600" />;
      default:
        return <Settings className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando adaptações inteligentes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Adaptação Inteligente</h2>
            <p className="text-muted-foreground">
              Sistema de ajuste automático baseado em IA
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleAnalyzeMetrics}
          disabled={analyzing}
          className="flex items-center gap-2"
        >
          {analyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Analisando...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              Analisar Métricas
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suggestions">Sugestões Ativas</TabsTrigger>
          <TabsTrigger value="rules">Regras de Adaptação</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-4">
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma sugestão disponível</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Execute uma análise de métricas para gerar sugestões inteligentes
                </p>
                <Button onClick={handleAnalyzeMetrics} disabled={analyzing}>
                  {analyzing ? 'Analisando...' : 'Analisar Agora'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            suggestions.map((suggestion) => (
              <Card key={suggestion.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getSuggestionIcon(suggestion.suggestion_type)}
                      <div>
                        <CardTitle className="text-lg">Adaptação Sugerida</CardTitle>
                        <CardDescription>
                          {suggestion.reasoning}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={getConfidenceColor(suggestion.confidence_score)}>
                      Confiança: {getConfidenceText(suggestion.confidence_score)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Métricas atuais */}
                  <div>
                    <h4 className="font-medium mb-2">Valores Atuais</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-medium">Valor Atual</div>
                         <div className="text-blue-600">
                           {typeof suggestion.current_value === 'object' ? JSON.stringify(suggestion.current_value) : String(suggestion.current_value)}
                         </div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-medium">Valor Sugerido</div>
                         <div className="text-green-600">
                           {typeof suggestion.suggested_value === 'object' ? JSON.stringify(suggestion.suggested_value) : String(suggestion.suggested_value)}
                         </div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-medium">Confiança</div>
                        <div className="text-purple-600">
                          {Math.round(suggestion.confidence_score * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Justificativa */}
                  <div>
                    <h4 className="font-medium mb-2">Justificativa</h4>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        {suggestion.reasoning}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handleApplySuggestion(suggestion.id)}
                      className="flex items-center gap-2"
                      disabled={suggestion.status !== 'pending'}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Aplicar Adaptação
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleRejectSuggestion(suggestion.id)}
                      className="flex items-center gap-2"
                      disabled={suggestion.status !== 'pending'}
                    >
                      <XCircle className="h-4 w-4" />
                      Rejeitar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Adaptação</CardTitle>
              <CardDescription>
                Configure regras automáticas para adaptação de exercícios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma regra configurada</h3>
                  <p className="text-muted-foreground mb-4">
                    As regras de adaptação permitem ajustes automáticos baseados no progresso do paciente
                  </p>
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Criar Primeira Regra
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{rule.description}</h4>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {rule.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Condição: {rule.condition_type} {rule.threshold_value}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ação: {rule.action_type} ({rule.adjustment_percentage}%)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}