/**
 * Predictive Dashboard Component
 *
 * Displays recovery predictions, risk factors, and milestones
 * Uses Firebase AI Logic predictions
 *
 * @module components/analytics/PredictiveDashboard
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  TrendingUp,
  Calendar,
  Target,
  Activity,
  RefreshCw,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';
import {
  useRecoveryPrediction,
  useRiskFactors,
  useMilestonesProgress,
  useGeneratePrediction,
  formatConfidenceScore,
  getRiskLevelColor,
  getRiskLevelLabel,
} from '@/hooks/usePredictiveAnalytics';
import { RecoveryPrediction } from '@/lib/ai/predictive-analytics';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// TYPES
// ============================================================================

interface PatientProfile {
  dateOfBirth?: string;
  gender?: string;
  [key: string]: unknown;
}

interface CurrentCondition {
  condition?: string;
  severity?: string;
  [key: string]: unknown;
}

interface TreatmentContext {
  startDate?: string;
  frequency?: string;
  [key: string]: unknown;
}

interface ProgressData {
  sessionsCompleted?: number;
  improvementPercentage?: number;
  [key: string]: unknown;
}

interface PredictiveDashboardProps {
  patientId: string;
  patientProfile?: PatientProfile;
  currentCondition?: CurrentCondition;
  treatmentContext?: TreatmentContext;
  progressData?: ProgressData;
}

interface RiskData {
  dropoutRisk: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: Array<{
    factor: string;
    impact: string;
  }>;
  recommendations?: string[];
}

interface Milestone {
  name: string;
  description?: string;
  expectedDate: string;
  achieved: boolean;
  criteria?: string[];
}

interface MilestonesData {
  milestones: Milestone[];
  achievedCount: number;
  totalCount: number;
  progressPercentage: number;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function RecoveryTimelineCard({
  prediction,
  isLoading,
}: {
  prediction?: RecoveryPrediction;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!prediction) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Linha do Tempo de Recuperação</CardTitle>
          <CardDescription>Previsão baseada em IA</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Gere uma previsão para ver a linha do tempo de recuperação
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { predictedRecoveryDate, confidenceInterval, confidenceScore } = prediction;

  const expectedDate = new Date(predictedRecoveryDate);
  const lowerDate = new Date(confidenceInterval.lower);
  const upperDate = new Date(confidenceInterval.upper);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha do Tempo de Recuperação</CardTitle>
        <CardDescription>
          Confiança: {formatConfidenceScore(confidenceScore)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main prediction */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Previsão esperada</p>
          <p className="text-3xl font-bold">
            {format(expectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {confidenceInterval.expectedDays} dias
          </p>
        </div>

        {/* Confidence interval */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Otimista</span>
            <span className="font-medium">
              {format(upperDate, "dd/MM/yyyy", { locale: ptBR })} ({confidenceInterval.upperDays} dias)
            </span>
          </div>
          <Progress value={25} className="h-2" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pessimista</span>
            <span className="font-medium">
              {format(lowerDate, "dd/MM/yyyy", { locale: ptBR })} ({confidenceInterval.lowerDays} dias)
            </span>
          </div>
        </div>

        {/* Visualization */}
        <div className="relative h-4 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"
            style={{
              left: `${(confidenceInterval.lowerDays / confidenceInterval.upperDays) * 100}%`,
              width: `${((confidenceInterval.upperDays - confidenceInterval.lowerDays) / confidenceInterval.upperDays) * 100}%`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Início</span>
          <span>Hoje</span>
          <span>Recuperação esperada</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskFactorsCard({
  riskData,
  isLoading,
}: {
  riskData?: RiskData;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!riskData || riskData.factors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Fatores de Risco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum fator de risco significativo identificado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className={`h-5 w-5 ${getRiskLevelColor(riskData.dropoutRisk)}`} />
          Fatores de Risco
        </CardTitle>
        <CardDescription>
          Nível de risco: <span className={`font-medium ${getRiskLevelColor(riskData.dropoutRisk)}`}>
            {getRiskLevelLabel(riskData.dropoutRisk)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {riskData.factors.map((factor, index: number) => (
          <Alert key={index} variant={factor.impact === 'high' ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">{factor.factor}</AlertTitle>
            <AlertDescription className="text-xs">
              {factor.impact}
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}

function MilestonesCard({
  milestonesData,
  isLoading,
}: {
  milestonesData?: MilestonesData;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!milestonesData || milestonesData.milestones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Marcos de Recuperação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Marcos serão definidos após gerar previsão</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Marcos de Recuperação
        </CardTitle>
        <CardDescription>
          {milestonesData.achievedCount} de {milestonesData.totalCount} concluídos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Progresso geral</span>
            <span className="font-medium">{milestonesData.progressPercentage}%</span>
          </div>
          <Progress value={milestonesData.progressPercentage} className="h-2" />
        </div>

        <Separator />

        {/* Milestones list */}
        <div className="space-y-3">
          {milestonesData.milestones.map((milestone, index: number) => (
            <div key={index} className="flex items-start gap-3">
              <div className={`mt-0.5 ${milestone.achieved ? 'text-green-500' : 'text-muted-foreground'}`}>
                {milestone.achieved ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{milestone.name}</p>
                <p className="text-xs text-muted-foreground">{milestone.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(milestone.expectedDate), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <Badge variant={milestone.achieved ? 'default' : 'secondary'}>
                {milestone.achieved ? 'Concluído' : 'Pendente'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TreatmentRecommendationsCard({
  prediction,
  isLoading,
}: {
  prediction?: RecoveryPrediction;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!prediction) {
    return null;
  }

  const { treatmentRecommendations } = prediction;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recomendações de Tratamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Frequência recomendada</p>
          <p className="text-lg font-semibold">{treatmentRecommendations.optimalFrequency}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Sessões totais estimadas</p>
          <p className="text-lg font-semibold">{treatmentRecommendations.estimatedTotalSessions}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Intensidade</p>
          <Badge
            variant={
              treatmentRecommendations.intensity === 'high'
                ? 'destructive'
                : treatmentRecommendations.intensity === 'moderate'
                ? 'default'
                : 'secondary'
            }
          >
            {treatmentRecommendations.intensity === 'high'
              ? 'Alta'
              : treatmentRecommendations.intensity === 'moderate'
              ? 'Moderada'
              : 'Baixa'}
          </Badge>
        </div>

        <Separator />

        <div>
          <p className="text-sm text-muted-foreground mb-2">Áreas de foco</p>
          <div className="flex flex-wrap gap-2">
            {treatmentRecommendations.focusAreas.map((area: string, index: number) => (
              <Badge key={index} variant="outline">
                {area}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PredictiveDashboard({
  patientId,
  patientProfile,
  currentCondition,
  treatmentContext,
  progressData,
}: PredictiveDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const generatePrediction = useGeneratePrediction();

  // Fetch stored prediction
  const { data: prediction, isLoading: isLoadingPrediction } = useRecoveryPrediction(
    patientProfile && currentCondition && treatmentContext
      ? {
          patientId,
          patientProfile,
          currentCondition,
          treatmentContext,
          progressData,
        }
      : null,
    { enabled: false } // Don't auto-generate, only fetch if exists
  );

  // Fetch risk factors and milestones
  const { data: riskData, isLoading: isLoadingRisk } = useRiskFactors(patientId);
  const { data: milestonesData, isLoading: isLoadingMilestones } = useMilestonesProgress(patientId);

  const handleGeneratePrediction = () => {
    if (!patientProfile || !currentCondition || !treatmentContext) {
      return;
    }

    generatePrediction.mutate({
      patientId,
      patientProfile,
      currentCondition,
      treatmentContext,
      progressData,
    });
  };

  const canGenerate = !!(patientProfile && currentCondition && treatmentContext);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análise Preditiva</h2>
          <p className="text-muted-foreground">
            Previsões de recuperação baseadas em IA
          </p>
        </div>
        {canGenerate && (
          <Button
            onClick={handleGeneratePrediction}
            disabled={generatePrediction.isPending}
          >
            {generatePrediction.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Gerar Previsão
              </>
            )}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="risks">Riscos</TabsTrigger>
          <TabsTrigger value="milestones">Marcos</TabsTrigger>
          <TabsTrigger value="treatment">Tratamento</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <RecoveryTimelineCard
              prediction={prediction || generatePrediction.data}
              isLoading={isLoadingPrediction || generatePrediction.isPending}
            />
            <RiskFactorsCard
              riskData={riskData}
              isLoading={isLoadingRisk}
            />
            <MilestonesCard
              milestonesData={milestonesData}
              isLoading={isLoadingMilestones}
            />
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <RecoveryTimelineCard
            prediction={prediction || generatePrediction.data}
            isLoading={isLoadingPrediction || generatePrediction.isPending}
          />
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <RiskFactorsCard
            riskData={riskData}
            isLoading={isLoadingRisk}
          />
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <MilestonesCard
            milestonesData={milestonesData}
            isLoading={isLoadingMilestones}
          />
        </TabsContent>

        <TabsContent value="treatment" className="space-y-4">
          <TreatmentRecommendationsCard
            prediction={prediction || generatePrediction.data}
            isLoading={isLoadingPrediction || generatePrediction.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PredictiveDashboard;
