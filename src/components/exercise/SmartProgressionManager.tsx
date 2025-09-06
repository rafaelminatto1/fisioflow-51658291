import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Brain, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Target
} from 'lucide-react';
import { useSmartProgression, ProgressionSuggestion } from '@/hooks/useSmartProgression';
import { usePatientProgress } from '@/hooks/usePatientProgress';
import { useExercisePlans } from '@/hooks/useExercisePlans';
import { toast } from 'sonner';

interface SmartProgressionManagerProps {
  patientId: string;
  exercisePlanId: string;
}

export function SmartProgressionManager({ patientId, exercisePlanId }: SmartProgressionManagerProps) {
  const [suggestion, setSuggestion] = useState<ProgressionSuggestion | null>(null);
  const [adherenceScore, setAdherenceScore] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoProgressionEnabled, setAutoProgressionEnabled] = useState(false);

  const { 
    analyzeProgressAndSuggest, 
    applyAutomaticAdjustments, 
    calculateAdherence
  } = useSmartProgression();
  
  const { getProgressByPatient } = usePatientProgress();
  const { getExercisePlan } = useExercisePlans();

  const exercisePlan = getExercisePlan(exercisePlanId);
  const patientProgress = getProgressByPatient(patientId);

  // Analisar progresso e gerar sugestões
  const analyzeProgress = useCallback(async () => {
    if (!exercisePlan) return;
    
    setIsAnalyzing(true);
    try {
      const recentProgress = patientProgress
        .sort((a, b) => new Date(b.progress_date).getTime() - new Date(a.progress_date).getTime())
        .slice(0, 5); // Últimos 5 registros

      const progressionSuggestion = await analyzeProgressAndSuggest(exercisePlan, recentProgress);
      setSuggestion(progressionSuggestion);

      if (progressionSuggestion) {
        toast.success('Análise de progressão concluída!');
      } else {
        toast.info('Dados insuficientes para análise de progressão');
      }
    } catch (error) {
      toast.error('Erro ao analisar progressão');
      console.error('Erro na análise:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [exercisePlan, patientProgress, analyzeProgressAndSuggest]);

  // Aplicar sugestão automaticamente
  const applySuggestion = async () => {
    if (!suggestion) return;

    try {
      await applyAutomaticAdjustments(exercisePlanId, suggestion.suggested_adjustments);
      toast.success('Ajustes aplicados com sucesso!');
      setSuggestion(null);
    } catch (error) {
      toast.error('Erro ao aplicar ajustes');
      console.error('Erro ao aplicar:', error);
    }
  };

  // Calcular aderência
  useEffect(() => {
    if (patientProgress.length > 0) {
      const adherence = calculateAdherence(patientProgress, 30);
      setAdherenceScore(adherence);
    }
  }, [patientProgress, calculateAdherence]);

  // Análise automática quando há novos dados
  useEffect(() => {
    if (autoProgressionEnabled && patientProgress.length >= 2) {
      analyzeProgress();
    }
  }, [patientProgress.length, autoProgressionEnabled, analyzeProgress]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'increase_intensity':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decrease_intensity':
        return <TrendingDown className="h-4 w-4 text-orange-600" />;
      case 'maintain':
        return <Activity className="h-4 w-4 text-blue-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'increase_intensity':
        return 'bg-green-100 text-green-800';
      case 'decrease_intensity':
        return 'bg-orange-100 text-orange-800';
      case 'maintain':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAdherenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aderência</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              <span className={getAdherenceColor(adherenceScore)}>
                {adherenceScore.toFixed(1)}%
              </span>
            </div>
            <Progress value={adherenceScore} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientProgress.length}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IA Ativa</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={autoProgressionEnabled ? 'default' : 'secondary'}>
                {autoProgressionEnabled ? 'Ativada' : 'Desativada'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoProgressionEnabled(!autoProgressionEnabled)}
              >
                {autoProgressionEnabled ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para diferentes visualizações */}
      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analysis">Análise IA</TabsTrigger>
          <TabsTrigger value="metrics">Métricas Detalhadas</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          {/* Botão de análise manual */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Análise Inteligente</h3>
            <Button 
              onClick={analyzeProgress}
              disabled={isAnalyzing || patientProgress.length < 2}
              className="flex items-center space-x-2"
            >
              <Brain className="h-4 w-4" />
              <span>{isAnalyzing ? 'Analisando...' : 'Analisar Progresso'}</span>
            </Button>
          </div>

          {/* Sugestão de progressão */}
          {suggestion && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getActionIcon(suggestion.suggested_action)}
                    <CardTitle className="text-lg">
                      Sugestão de Progressão
                    </CardTitle>
                  </div>
                  <Badge className={getActionColor(suggestion.suggested_action)}>
                    {suggestion.suggested_action.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <CardDescription>
                  Confiança: {(suggestion.confidence_score * 100).toFixed(0)}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {suggestion.reason}
                  </AlertDescription>
                </Alert>

                {/* Métricas utilizadas */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold">Dor</div>
                    <div className="text-2xl font-bold text-red-600">
                      {suggestion.metrics_used.pain_level}/10
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Função</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {suggestion.metrics_used.functional_score}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Aderência</div>
                    <div className="text-2xl font-bold text-green-600">
                      {suggestion.metrics_used.exercise_compliance}%
                    </div>
                  </div>
                </div>

                {/* Ajustes sugeridos */}
                {Object.keys(suggestion.suggested_adjustments).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Ajustes Sugeridos:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {suggestion.suggested_adjustments.sets && (
                        <div className="flex justify-between">
                          <span>Séries:</span>
                          <span className="font-semibold">
                            {suggestion.suggested_adjustments.sets > 0 ? '+' : ''}
                            {suggestion.suggested_adjustments.sets}
                          </span>
                        </div>
                      )}
                      {suggestion.suggested_adjustments.reps && (
                        <div className="flex justify-between">
                          <span>Repetições:</span>
                          <span className="font-semibold">
                            {suggestion.suggested_adjustments.reps > 0 ? '+' : ''}
                            {suggestion.suggested_adjustments.reps}
                          </span>
                        </div>
                      )}
                      {suggestion.suggested_adjustments.rest_time && (
                        <div className="flex justify-between">
                          <span>Descanso:</span>
                          <span className="font-semibold">
                            {suggestion.suggested_adjustments.rest_time > 0 ? '+' : ''}
                            {suggestion.suggested_adjustments.rest_time}s
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex space-x-2">
                  <Button onClick={applySuggestion} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aplicar Sugestão
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSuggestion(null)}
                    className="flex-1"
                  >
                    Descartar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estado quando não há sugestões */}
          {!suggestion && !isAnalyzing && (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma Análise Disponível</h3>
                <p className="text-muted-foreground mb-4">
                  Execute uma análise para receber sugestões inteligentes de progressão.
                </p>
                {patientProgress.length < 2 && (
                  <p className="text-sm text-orange-600">
                    São necessários pelo menos 2 registros de progresso para análise.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {/* Métricas detalhadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolução da Dor</CardTitle>
              </CardHeader>
              <CardContent>
                {patientProgress.length >= 2 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Inicial:</span>
                      <span className="font-semibold">
                        {patientProgress[patientProgress.length - 1]?.pain_level}/10
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Atual:</span>
                      <span className="font-semibold">
                        {patientProgress[0]?.pain_level}/10
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Melhoria:</span>
                      <span className={`font-semibold ${
                        (patientProgress[patientProgress.length - 1]?.pain_level || 0) - 
                        (patientProgress[0]?.pain_level || 0) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {((patientProgress[patientProgress.length - 1]?.pain_level || 0) - 
                         (patientProgress[0]?.pain_level || 0)).toFixed(1)} pontos
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Dados insuficientes</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolução Funcional</CardTitle>
              </CardHeader>
              <CardContent>
                {patientProgress.length >= 2 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Inicial:</span>
                      <span className="font-semibold">
                        {patientProgress[patientProgress.length - 1]?.functional_score}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Atual:</span>
                      <span className="font-semibold">
                        {patientProgress[0]?.functional_score}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Melhoria:</span>
                      <span className={`font-semibold ${
                        (patientProgress[0]?.functional_score || 0) - 
                        (patientProgress[patientProgress.length - 1]?.functional_score || 0) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        +{((patientProgress[0]?.functional_score || 0) - 
                           (patientProgress[patientProgress.length - 1]?.functional_score || 0)).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Dados insuficientes</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}