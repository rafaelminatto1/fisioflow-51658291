import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle, 
  XCircle, 
  Clock,
  Target,
  Activity,
  AlertTriangle,
  Lightbulb,
  Settings
} from 'lucide-react';
import { useSmartAdaptation, AdaptationSuggestion } from '@/hooks/useSmartAdaptation';
import { usePatientProgress } from '@/hooks/usePatientProgress';
import { toast } from 'sonner';

interface SmartAdaptationManagerProps {
  patientId: string;
}

export function SmartAdaptationManager({ patientId }: SmartAdaptationManagerProps) {
  const {
    adaptationRules,
    suggestions,
    loading,
    error,
    analyzePatientMetrics,
    applySuggestion,
    rejectSuggestion
  } = useSmartAdaptation();

  const { patientProgress, fetchPatientProgress } = usePatientProgress();
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');

  const patientSuggestions = suggestions.filter(s => s.patient_id === patientId);
  const pendingSuggestions = patientSuggestions.filter(s => s.status === 'pending');
  const recentProgress = patientProgress.filter(p => p.patient_id === patientId).slice(0, 5);

  useEffect(() => {
    if (patientId) {
      fetchPatientProgress();
    }
  }, [patientId, fetchPatientProgress]);

  const handleAnalyzeMetrics = async () => {
    try {
      setAnalyzing(true);
      const newSuggestions = await analyzePatientMetrics(patientId);
      
      if (newSuggestions.length > 0) {
        toast.success(`${newSuggestions.length} nova(s) sugestão(ões) gerada(s)`);
      } else {
        toast.info('Nenhuma adaptação necessária no momento');
      }
    } catch (error) {
      toast.error('Erro ao analisar métricas do paciente');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    try {
      await applySuggestion(suggestionId);
      toast.success('Adaptação aplicada com sucesso');
    } catch (error) {
      toast.error('Erro ao aplicar adaptação');
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      await rejectSuggestion(suggestionId);
      toast.success('Sugestão rejeitada');
    } catch (error) {
      toast.error('Erro ao rejeitar sugestão');
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceText = (score: number) => {
    if (score >= 0.8) return 'Alta';
    if (score >= 0.6) return 'Média';
    return 'Baixa';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'decreasing':
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const calculateTrends = () => {
    if (recentProgress.length < 2) return null;

    const latest = recentProgress[0];
    const previous = recentProgress[1];

    return {
      pain: latest.pain_level > previous.pain_level + 1 ? 'increasing' :
            latest.pain_level < previous.pain_level - 1 ? 'decreasing' : 'stable',
      functional: latest.functional_score > previous.functional_score + 5 ? 'improving' :
                 latest.functional_score < previous.functional_score - 5 ? 'declining' : 'stable',
      compliance: latest.exercise_compliance > previous.exercise_compliance + 10 ? 'improving' :
                 latest.exercise_compliance < previous.exercise_compliance - 10 ? 'declining' : 'stable'
    };
  };

  const trends = calculateTrends();

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
      {/* Header com análise rápida */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Adaptação Inteligente
              </CardTitle>
              <CardDescription>
                Sistema de ajuste automático baseado em métricas do paciente
              </CardDescription>
            </div>
            <Button 
              onClick={handleAnalyzeMetrics} 
              disabled={analyzing || loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {analyzing ? (
                <>
                  <Settings className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Analisar Métricas
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        
        {trends && (
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                {getTrendIcon(trends.pain)}
                <div>
                  <div className="text-sm font-medium">Dor</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {trends.pain === 'increasing' ? 'Aumentando' :
                     trends.pain === 'decreasing' ? 'Diminuindo' : 'Estável'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                {getTrendIcon(trends.functional)}
                <div>
                  <div className="text-sm font-medium">Funcionalidade</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {trends.functional === 'improving' ? 'Melhorando' :
                     trends.functional === 'declining' ? 'Piorando' : 'Estável'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                {getTrendIcon(trends.compliance)}
                <div>
                  <div className="text-sm font-medium">Aderência</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {trends.compliance === 'improving' ? 'Melhorando' :
                     trends.compliance === 'declining' ? 'Piorando' : 'Estável'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tabs para diferentes seções */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suggestions">Sugestões ({pendingSuggestions.length})</TabsTrigger>
          <TabsTrigger value="rules">Regras ({adaptationRules.length})</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-4">
          {pendingSuggestions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma sugestão pendente</h3>
                <p className="text-muted-foreground mb-4">
                  Execute uma análise para gerar novas sugestões de adaptação.
                </p>
                <Button onClick={handleAnalyzeMetrics} disabled={analyzing}>
                  <Brain className="w-4 h-4 mr-2" />
                  Analisar Agora
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="border-l-4 border-l-purple-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Target className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Adaptação Sugerida</CardTitle>
                          <CardDescription>
                            {suggestion.suggested_changes.action_description}
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
                      <h4 className="font-medium mb-2">Métricas Atuais</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-medium">Dor</div>
                          <div className="text-red-600">
                            {suggestion.current_metrics.pain_level}/10
                          </div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-medium">Funcional</div>
                          <div className="text-blue-600">
                            {suggestion.current_metrics.functional_score}%
                          </div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-medium">Aderência</div>
                          <div className="text-green-600">
                            {Math.round(suggestion.current_metrics.compliance)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mudanças propostas */}
                    <div>
                      <h4 className="font-medium mb-2">Mudanças Propostas</h4>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <Activity className="w-4 h-4" />
                          <span>{suggestion.suggested_changes.action_description}</span>
                        </div>
                        {suggestion.suggested_changes.new_intensity && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            Nova intensidade: {suggestion.suggested_changes.new_intensity}
                          </div>
                        )}
                        {suggestion.suggested_changes.new_duration && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            Nova duração: {suggestion.suggested_changes.new_duration} min
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Ações */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleApplySuggestion(suggestion.id)}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aplicar
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleRejectSuggestion(suggestion.id)}
                        disabled={loading}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rejeitar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="grid gap-4">
            {adaptationRules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{rule.description}</h4>
                      <p className="text-sm text-muted-foreground">
                        Condição: {rule.condition_type} | Ação: {rule.action_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ajuste: {rule.adjustment_percentage}%
                      </p>
                    </div>
                    <Badge variant="outline">
                      Ativa
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Histórico em Desenvolvimento</h3>
              <p className="text-muted-foreground">
                O histórico de adaptações será implementado em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}