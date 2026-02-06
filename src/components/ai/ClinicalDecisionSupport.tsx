/**
 * ClinicalDecisionSupport Component
 *
 * Provides AI-powered clinical analysis and decision support for physical therapy.
 * Integrates pain analysis, predictive analytics, and treatment recommendations.
 *
 * Features:
 * - Pain evolution analysis with visual annotations
 * - Recovery timeline predictions
 * - Treatment response evaluation
 * - Risk factor identification
 * - Evidence-based recommendations
 * - Similar case comparisons
 *
 * @module components/ai/ClinicalDecisionSupport
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Calendar,
  Target,
  Loader2,
  Sparkles,
  BarChart3,
  HeartPulse,
  Eye
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Patient } from '@/types';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ClinicalDecisionSupportProps {
  /** Patient information */
  patient: Pick<Patient, 'id' | 'name' | 'birthDate' | 'gender' | 'mainCondition'> & {
    age: number;
  };
  /** Current pain level (0-10) */
  currentPainLevel?: number;
  /** Treatment start date */
  treatmentStartDate?: string;
  /** Number of sessions completed */
  sessionsCompleted?: number;
  /** Treatment frequency */
  treatmentFrequency?: string;
  /** Callback to apply recommendations */
  onApplyRecommendation?: (recommendation: string) => void;
}

interface PainAnalysisResult {
  overallTrend: 'improving' | 'stable' | 'worsening';
  globalPainChange: number;
  percentageChange: number;
  trendDescription: string;
  keyFindings: string[];
  clinicalAlerts: string[];
  positiveIndicators: string[];
}

interface RecoveryPrediction {
  predictedRecoveryDate: string;
  confidenceInterval: {
    lower: string;
    upper: string;
    expectedDays: number;
  };
  confidenceScore: number;
  milestones: Array<{
    name: string;
    description: string;
    expectedDate: string;
    achieved: boolean;
  }>;
  riskFactors: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
    mitigation?: string;
  }>;
  treatmentRecommendations: {
    sessionsPerWeek: number;
    estimatedTotalSessions: number;
    intensity: 'low' | 'moderate' | 'high';
    focusAreas: string[];
  };
  similarCases: {
    totalAnalyzed: number;
    averageRecoveryTime: number;
    successRate: number;
    keyInsights: string[];
  };
}

interface TreatmentResponse {
  effectiveness: 'excellent' | 'good' | 'moderate' | 'minimal' | 'none' | 'worsening';
  painReductionPercentage: number;
  overallAssessment: string;
  recommendations: string[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ClinicalDecisionSupport({
  patient,
  currentPainLevel = 5,
  treatmentStartDate,
  sessionsCompleted = 0,
  treatmentFrequency = '2x/week',
  onApplyRecommendation
}: ClinicalDecisionSupportProps) {
  // State management
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pain' | 'recovery' | 'response'>('pain');
  const [optimisticResult, setOptimisticResult] = useState<string | null>(null);
  const [painAnalysis, setPainAnalysis] = useState<PainAnalysisResult | null>(null);
  const [recoveryPrediction, setRecoveryPrediction] = useState<RecoveryPrediction | null>(null);
  const [treatmentResponse, setTreatmentResponse] = useState<TreatmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Run all analyses
   */
  const runAllAnalyses = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress(10);

    // Optimistic UI update
    setOptimisticResult('Analisando dados clínicos e gerando insights...');

    try {
      setProgress(20);

      // Run all analyses in parallel
      const [painData, recoveryData, responseData] = await Promise.all([
        analyzePainEvolution(),
        predictRecovery(),
        evaluateTreatmentResponse(),
      ]);

      setProgress(80);

      setPainAnalysis(painData);
      setRecoveryPrediction(recoveryData);
      setTreatmentResponse(responseData);

      setProgress(100);

      setOptimisticResult(null);

      toast({
        title: 'Análise clínicas concluídas!',
        description: 'Todos os insights foram gerados com sucesso',
      });
    } catch (err) {
      logger.error('[ClinicalDecisionSupport] Error', err, 'ClinicalDecisionSupport');
      const errorMessage = err instanceof Error ? err.message : 'Erro ao realizar análises';
      setError(errorMessage);
      setOptimisticResult(null);
      toast({
        title: 'Erro nas análises',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [patient.id]);

  /**
   * Analyze pain evolution (Firebase Cloud Functions)
   */
  const analyzePainEvolution = useCallback(async (): Promise<PainAnalysisResult> => {
    const { analyzePainEvolution: analyzePain } = await import('@/services/ai/firebaseAIService');
    const data = await analyzePain(patient.id, currentPainLevel ?? 0);
    return data as unknown as PainAnalysisResult;
  }, [patient.id, currentPainLevel]);

  /**
   * Predict recovery timeline (Firebase Cloud Functions)
   */
  const predictRecovery = useCallback(async (): Promise<RecoveryPrediction> => {
    const { predictRecovery: predict } = await import('@/services/ai/firebaseAIService');
    const data = await predict(
      patient.id,
      { age: patient.age, gender: patient.gender, baselinePainLevel: currentPainLevel, mainComplaint: patient.mainCondition },
      { primaryPathology: patient.mainCondition, onsetDate: treatmentStartDate, bodyParts: [] },
      { sessionsCompleted, currentFrequency: treatmentFrequency, treatmentType: 'fisioterapia', techniquesUsed: [] }
    );
    return data as unknown as RecoveryPrediction;
  }, [patient, currentPainLevel, treatmentStartDate, sessionsCompleted, treatmentFrequency]);

  /**
   * Evaluate treatment response (Firebase Cloud Functions)
   */
  const evaluateTreatmentResponse = useCallback(async (): Promise<TreatmentResponse> => {
    const { evaluateTreatmentResponse: evaluate } = await import('@/services/ai/firebaseAIService');
    const data = await evaluate(patient.id, sessionsCompleted ?? 0, currentPainLevel ?? 0);
    return data as unknown as TreatmentResponse;
  }, [patient.id, sessionsCompleted, currentPainLevel]);

  /**
   * Get trend icon
   */
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'worsening':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-amber-500" />;
    }
  };

  /**
   * Get effectiveness badge color
   */
  const getEffectivenessColor = (effectiveness: string) => {
    switch (effectiveness) {
      case 'excellent':
      case 'good':
        return 'default';
      case 'moderate':
      case 'minimal':
        return 'secondary';
      default:
        return 'destructive';
    }
  };

  /**
   * Get impact color
   */
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-amber-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-muted-foreground';
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  /**
   * Apply recommendation to SOAP
   */
  const applyRecommendation = useCallback((recommendation: string) => {
    onApplyRecommendation?.(recommendation);

    toast({
      title: 'Recomendação aplicada',
      description: 'A recomendação foi adicionada ao plano de tratamento',
    });
  }, [onApplyRecommendation]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">Suporte à Decisão Clínica</CardTitle>
              <CardDescription>
                Análises e insights para {patient.name}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={runAllAnalyses}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando dados...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Executar Análises Completas
              </>
            )}
          </Button>

          {loading && progress > 0 && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {progress < 30 && 'Coletando dados do paciente...'}
                {progress >= 30 && progress < 60 && 'Analisando evolução da dor...'}
                {progress >= 60 && progress < 90 && 'Gerando predições...'}
                {progress >= 90 && 'Finalizando análises...'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold">Erro nas análises</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={runAllAnalyses}
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimistic Loading */}
      {optimisticResult && (
        <Card className="border-primary/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm">{optimisticResult}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Tabs */}
      {(painAnalysis || recoveryPrediction || treatmentResponse) && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pain' | 'recovery' | 'response')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pain">
              <HeartPulse className="h-4 w-4 mr-2" />
              Análise de Dor
            </TabsTrigger>
            <TabsTrigger value="recovery">
              <Calendar className="h-4 w-4 mr-2" />
              Predição de Recuperação
            </TabsTrigger>
            <TabsTrigger value="response">
              <BarChart3 className="h-4 w-4 mr-2" />
              Resposta ao Tratamento
            </TabsTrigger>
          </TabsList>

          {/* Pain Analysis Tab */}
          {painAnalysis && (
            <TabsContent value="pain" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getTrendIcon(painAnalysis.overallTrend)}
                    Tendência de Dor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold mb-1">
                      {painAnalysis.globalPainChange > 0 ? '+' : ''}{painAnalysis.globalPainChange}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Mudança no nível de dor
                    </p>
                    <Badge
                      variant={painAnalysis.overallTrend === 'improving' ? 'default' : painAnalysis.overallTrend === 'worsening' ? 'destructive' : 'secondary'}
                      className="mt-2"
                    >
                      {painAnalysis.trendDescription}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Achados Principais
                    </h4>
                    <ul className="space-y-2">
                      {painAnalysis.keyFindings.map((finding, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {painAnalysis.positiveIndicators.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Indicadores Positivos
                      </h4>
                      <ul className="space-y-2">
                        {painAnalysis.positiveIndicators.map((indicator, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {indicator}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {painAnalysis.clinicalAlerts.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                        Alertas Clínicos
                      </h4>
                      <ul className="space-y-2">
                        {painAnalysis.clinicalAlerts.map((alert, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {alert}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Recovery Prediction Tab */}
          {recoveryPrediction && (
            <TabsContent value="recovery" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Previsão de Recuperação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Data prevista de alta</p>
                    <p className="text-2xl font-bold">
                      {formatDate(recoveryPrediction.predictedRecoveryDate)}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Badge variant="outline">
                        Confiança: {Math.round(recoveryPrediction.confidenceScore * 100)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">Otimista</p>
                      <p className="font-semibold text-sm">{formatDate(recoveryPrediction.confidenceInterval.lower)}</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">Esperado</p>
                      <p className="font-semibold text-sm">{recoveryPrediction.confidenceInterval.expectedDays} dias</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">Pessimista</p>
                      <p className="font-semibold text-sm">{formatDate(recoveryPrediction.confidenceInterval.upper)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Marcos de Recuperação</h4>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2 pr-4">
                        {recoveryPrediction.milestones.map((milestone, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-lg border ${
                              milestone.achieved ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-muted/50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{milestone.name}</p>
                                <p className="text-xs text-muted-foreground">{milestone.description}</p>
                                <p className="text-xs mt-1">Previsto: {formatDate(milestone.expectedDate)}</p>
                              </div>
                              {milestone.achieved && (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">Fatores de Risco</h4>
                    <div className="space-y-2">
                      {recoveryPrediction.riskFactors.map((factor, i) => (
                        <div key={i} className="p-3 rounded-lg border">
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-medium text-sm">{factor.factor}</p>
                            <Badge variant="outline" className={getImpactColor(factor.impact)}>
                              {factor.impact}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{factor.description}</p>
                          {factor.mitigation && (
                            <p className="text-xs mt-1">
                              <strong>Mitigação:</strong> {factor.mitigation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">Casos Similares</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{recoveryPrediction.similarCases.totalAnalyzed}</p>
                        <p className="text-xs text-muted-foreground">Casos analisados</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{recoveryPrediction.similarCases.averageRecoveryTime}</p>
                        <p className="text-xs text-muted-foreground">Média de sessões</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{recoveryPrediction.similarCases.successRate}%</p>
                        <p className="text-xs text-muted-foreground">Taxa de sucesso</p>
                      </div>
                    </div>
                    {recoveryPrediction.similarCases.keyInsights.length > 0 && (
                      <div className="mt-3 p-3 bg-muted/50 rounded">
                        {recoveryPrediction.similarCases.keyInsights.map((insight, i) => (
                          <p key={i} className="text-xs">• {insight}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Treatment Response Tab */}
          {treatmentResponse && (
            <TabsContent value="response" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Resposta ao Tratamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Badge variant={getEffectivenessColor(treatmentResponse.effectiveness)} className="mb-2">
                      {treatmentResponse.effectiveness === 'excellent' && 'Excelente'}
                      {treatmentResponse.effectiveness === 'good' && 'Boa'}
                      {treatmentResponse.effectiveness === 'moderate' && 'Moderada'}
                      {treatmentResponse.effectiveness === 'minimal' && 'Mínima'}
                      {treatmentResponse.effectiveness === 'none' && 'Sem melhora'}
                      {treatmentResponse.effectiveness === 'worsening' && 'Piora'}
                    </Badge>
                    <p className="text-3xl font-bold mt-2">
                      {treatmentResponse.painReductionPercentage > 0 ? '+' : ''}{treatmentResponse.painReductionPercentage}%
                    </p>
                    <p className="text-sm text-muted-foreground">Redução da dor</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Avaliação Geral</h4>
                    <p className="text-sm bg-muted/50 p-3 rounded">
                      {treatmentResponse.overallAssessment}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">Recomendações</h4>
                    <div className="space-y-2">
                      {treatmentResponse.recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => applyRecommendation(rec)}
                        >
                          <p className="text-sm">{rec}</p>
                          <p className="text-xs text-muted-foreground mt-1">Clique para aplicar</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}

export default ClinicalDecisionSupport;
