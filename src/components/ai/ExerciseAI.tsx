/**
 * ExerciseAI Component
 *
 * Provides AI-powered exercise suggestions for physical therapy patients.
 * Uses Gemini 2.5 Flash-Lite for cost-effective recommendations based on:
 * - Patient profile and demographics
 * - Clinical history (SOAP notes)
 * - Current pain presentation
 * - Treatment goals and available equipment
 * - Treatment phase
 *
 * Features:
 * - Optimistic UI updates for instant feedback
 * - Loading and error states
 * - Exercise library matching
 * - Progression criteria
 * - Safety precautions
 *
 * @module components/ai/ExerciseAI
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Dumbbell,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  Sparkles,
  Loader2,
  Copy,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Exercise, Patient, SOAPRecord } from '@/types';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ExerciseAIProps {
  /** Patient information */
  patient: Pick<Patient, 'id' | 'name' | 'birthDate' | 'gender' | 'mainCondition' | 'medicalHistory'> & {
    age: number;
  };
  /** Clinical history for context */
  soapHistory?: Array<Pick<SOAPRecord, 'id' | 'sessionNumber' | 'subjective' | 'objective' | 'assessment' | 'plan'>>;
  /** Current pain map data */
  painMap?: Record<string, number>;
  /** Treatment goals */
  goals?: string[];
  /** Available equipment */
  availableEquipment?: string[];
  /** Current treatment phase */
  treatmentPhase?: 'initial' | 'progressive' | 'advanced' | 'maintenance';
  /** Number of sessions completed */
  sessionCount?: number;
  /** Available exercise library */
  exerciseLibrary?: Exercise[];
  /** Callback when exercises are selected */
  onExerciseSelect?: (exerciseIds: string[]) => void;
}

interface ExerciseRecommendation {
  exerciseId: string;
  name: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rationale: string;
  targetArea: string;
  goalsAddressed: string[];
  sets?: number;
  reps?: string;
  duration?: number;
  frequency?: string;
  precautions?: string[];
  confidence: number;
}

interface ExerciseProgramResponse {
  exercises: ExerciseRecommendation[];
  programRationale: string;
  expectedOutcomes: string[];
  progressionCriteria: string[];
  redFlags?: string[];
  alternatives?: ExerciseRecommendation[];
  estimatedDuration: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExerciseAI({
  patient,
  soapHistory = [],
  painMap = {},
  goals = [],
  availableEquipment = [],
  treatmentPhase = 'initial',
  sessionCount = 0,
  exerciseLibrary = [],
  onExerciseSelect
}: ExerciseAIProps) {
  // State management
  const [loading, setLoading] = useState(false);
  const [optimisticResult, setOptimisticResult] = useState<ExerciseProgramResponse | null>(null);
  const [finalResult, setFinalResult] = useState<ExerciseProgramResponse | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Generate exercise recommendations using AI
   */
  const generateRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress(10);

    // Optimistic UI update
    setOptimisticResult({
      exercises: [],
      programRationale: 'Analisando perfil do paciente e gerando recomendações...',
      expectedOutcomes: [],
      progressionCriteria: [],
      estimatedDuration: 0,
    });

    try {
      setProgress(30);

      // Build request payload
      const payload = {
        patient: {
          id: patient.id,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          mainCondition: patient.mainCondition,
        },
        soapHistory: soapHistory.slice(-3),
        painMap,
        goals,
        availableEquipment,
        treatmentPhase,
        sessionCount,
      };

      setProgress(50);

      // Firebase Cloud Functions - aiExerciseSuggestion
      const { getExerciseSuggestions } = await import('@/services/ai/firebaseAIService');
      const result = await getExerciseSuggestions({
        patientId: patient.id,
        goals: goals ?? [],
        availableEquipment: availableEquipment ?? [],
        treatmentPhase,
        painMap,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Falha ao gerar recomendações');
      }

      setProgress(80);

      const data: ExerciseProgramResponse = result.data as unknown as ExerciseProgramResponse;

      setProgress(100);

      // Update final result
      setFinalResult(data);
      setOptimisticResult(null);

      toast({
        title: 'Recomendações geradas!',
        description: `${data.exercises.length} exercícios sugeridos para ${patient.name}`,
      });
    } catch (err) {
      logger.error('[ExerciseAI] Error', err, 'ExerciseAI');
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar recomendações';
      setError(errorMessage);
      setOptimisticResult(null);
      toast({
        title: 'Erro ao gerar recomendações',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [patient, soapHistory, painMap, goals, availableEquipment, treatmentPhase, sessionCount]);

  /**
   * Toggle exercise selection
   */
  const toggleExercise = useCallback((exerciseId: string) => {
    setSelectedExercises(prev => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  }, []);

  /**
   * Apply selected exercises to treatment plan
   */
  const applyExercises = useCallback(() => {
    if (selectedExercises.size === 0) {
      toast({
        title: 'Nenhum exercício selecionado',
        description: 'Selecione pelo menos um exercício para aplicar',
        variant: 'destructive',
      });
      return;
    }

    onExerciseSelect?.(Array.from(selectedExercises));

    toast({
      title: 'Exercícios aplicados!',
      description: `${selectedExercises.size} exercícios adicionados ao plano de tratamento`,
    });
  }, [selectedExercises, onExerciseSelect]);

  /**
   * Copy program to clipboard
   */
  const copyProgram = useCallback(() => {
    if (!finalResult) return;

    const text = `
Programa de Exercícios - ${patient.name}

RACIONAL:
${finalResult.programRationale}

EXERCÍCIOS:
${finalResult.exercises.map((ex, i) => `
${i + 1}. ${ex.name}
   - Categoria: ${ex.category}
   - Dificuldade: ${ex.difficulty}
   - Área alvo: ${ex.targetArea}
   - Racional: ${ex.rationale}
   - Séries: ${ex.sets || 'N/A'}
   - Repetições: ${ex.reps || 'N/A'}
   - Duração: ${ex.duration ? `${ex.duration} min` : 'N/A'}
   - Frequência: ${ex.frequency || 'N/A'}
   ${ex.precautions && ex.precautions.length > 0 ? `- Precauções: ${ex.precautions.join(', ')}` : ''}
`).join('\n')}

RESULTADOS ESPERADOS:
${finalResult.expectedOutcomes.map(o => `- ${o}`).join('\n')}

CRITÉRIOS DE PROGRESSÃO:
${finalResult.progressionCriteria.map(c => `- ${c}`).join('\n')}
${finalResult.redFlags && finalResult.redFlags.length > 0 ? `
SINAIS DE ALERTA:
${finalResult.redFlags.map(r => `- ${r}`).join('\n')}
` : ''}
    `.trim();

    navigator.clipboard.writeText(text);

    toast({
      title: 'Programa copiado!',
      description: 'O programa foi copiado para a área de transferência',
    });
  }, [finalResult, patient.name]);

  /**
   * Get difficulty badge color
   */
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'default';
      case 'intermediate':
        return 'secondary';
      case 'advanced':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  /**
   * Get difficulty label in Portuguese
   */
  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'Iniciante';
      case 'intermediate':
        return 'Intermediário';
      case 'advanced':
        return 'Avançado';
      default:
        return difficulty;
    }
  };

  // Display result (optimistic or final)
  const result = optimisticResult || finalResult;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">IA de Exercícios</CardTitle>
              <CardDescription>
                Recomendações personalizadas para {patient.name}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={generateRecommendations}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando recomendações...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Exercícios com IA
              </>
            )}
          </Button>

          {loading && progress > 0 && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Analisando perfil clínico...
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
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold">Erro ao gerar recomendações</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={generateRecommendations}
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {result && result.exercises.length > 0 && (
        <>
          {/* Program Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Programa de Exercícios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Racional do Programa</h4>
                <p className="text-sm text-muted-foreground">{result.programRationale}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Duração estimada: <strong>{result.estimatedDuration} min</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Exercícios: <strong>{result.exercises.length}</strong>
                  </span>
                </div>
              </div>

              {result.redFlags && result.redFlags.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                        Sinais de Alerta
                      </p>
                      <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                        {result.redFlags.map((flag, i) => (
                          <li key={i}>• {flag}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exercise List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Exercícios Recomendados</CardTitle>
                {selectedExercises.size > 0 && (
                  <Badge variant="default">
                    {selectedExercises.size} selecionados
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {result.exercises.map((exercise, index) => (
                    <Card
                      key={exercise.exerciseId || index}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedExercises.has(exercise.exerciseId) ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => toggleExercise(exercise.exerciseId)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{exercise.name}</h4>
                              <Badge variant={getDifficultyColor(exercise.difficulty)}>
                                {getDifficultyLabel(exercise.difficulty)}
                              </Badge>
                              {selectedExercises.has(exercise.exerciseId) && (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              )}
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">
                              {exercise.rationale}
                            </p>

                            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                              <div>
                                <span className="font-medium">Categoria:</span>{' '}
                                {exercise.category}
                              </div>
                              <div>
                                <span className="font-medium">Área alvo:</span>{' '}
                                {exercise.targetArea}
                              </div>
                              {exercise.sets && (
                                <div>
                                  <span className="font-medium">Séries:</span> {exercise.sets}
                                </div>
                              )}
                              {exercise.reps && (
                                <div>
                                  <span className="font-medium">Reps:</span> {exercise.reps}
                                </div>
                              )}
                            </div>

                            {exercise.goalsAddressed && exercise.goalsAddressed.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {exercise.goalsAddressed.map((goal, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {goal}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {exercise.precautions && exercise.precautions.length > 0 && (
                              <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded text-xs">
                                <strong>Precauções:</strong> {exercise.precautions.join(', ')}
                              </div>
                            )}

                            {exercise.confidence && (
                              <div className="mt-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>Confiança:</span>
                                  <Progress value={exercise.confidence * 100} className="h-1 w-16" />
                                  <span>{Math.round(exercise.confidence * 100)}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Expected Outcomes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Resultados Esperados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.expectedOutcomes.map((outcome, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{outcome}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Progression Criteria */}
          <Card>
            <CardHeader>
              <CardTitle>Critérios de Progressão</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.progressionCriteria.map((criteria, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{criteria}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={applyExercises} disabled={selectedExercises.size === 0}>
              <Dumbbell className="mr-2 h-4 w-4" />
              Aplicar Selecionados ({selectedExercises.size})
            </Button>

            <Button variant="outline" onClick={copyProgram}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar Programa
            </Button>

            <Button variant="outline" onClick={generateRecommendations}>
              <Sparkles className="mr-2 h-4 w-4" />
              Regenerar
            </Button>
          </div>
        </>
      )}

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Powered by Gemini AI</p>
              <p className="text-muted-foreground">
                Recomendações baseadas em evidências científicas e guidelines de fisioterapia.
                Sempre avalie e ajuste conforme necessidade do paciente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ExerciseAI;
