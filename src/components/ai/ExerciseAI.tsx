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

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EmptyState } from '@/components/ui/EmptyState';
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
  ChevronRight,
  Users,
  Calendar,
  Zap,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import type { Exercise, Patient, SOAPRecord } from '@/types';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { generateExercisePlanWithIA, type ExercisePlanResponse } from '@/services/ai/firebaseAIService';

const NO_PATIENT_ERROR_MSG =
  'Abra a IA Assistente no perfil de um paciente para recomendações personalizadas.';

// ============================================================================
// TYPES
// ============================================================================

export interface ExerciseAIProps {
  /** Patient information (optional when used from Exercises page without patient context) */
  patient?: Pick<Patient, 'id' | 'name' | 'birthDate' | 'gender' | 'mainCondition' | 'medicalHistory'> & {
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
  const navigate = useNavigate();
  const patientName = useMemo(() => patient?.name ?? 'recomendações gerais', [patient?.name]);
  const patientId = patient?.id;
  const hasPatient = Boolean(patientId);

  // State management
  const [loading, setLoading] = useState(false);
  const [optimisticResult, setOptimisticResult] = useState<ExerciseProgramResponse | null>(null);
  const [finalResult, setFinalResult] = useState<ExerciseProgramResponse | null>(null);
  const [genkitResult, setGenkitResult] = useState<ExercisePlanResponse | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Gera um plano de exercícios completo usando o novo fluxo Genkit (IA Coach)
   */
  const generateFullPlanWithGenkit = useCallback(async () => {
    if (!patientId || !patient) return;

    setLoading(true);
    setError(null);
    setProgress(20);
    setGenkitResult(null);

    try {
      setProgress(40);
      const result = await generateExercisePlanWithIA({
        patientName: patient.name,
        age: patient.age,
        condition: patient.mainCondition || 'Condição não especificada',
        painLevel: Object.values(painMap).reduce((a, b) => Math.max(a, b), 0),
        equipment: availableEquipment,
        goals: goals.join(', ') || 'Melhoria geral',
        limitations: patient.medicalHistory || 'Nenhuma informada'
      });

      setProgress(100);
      setGenkitResult(result);

      toast({
        title: 'Plano completo gerado!',
        description: `O AI Coach criou o plano: ${result.planName}`,
      });
    } catch (err) {
      logger.error('[ExerciseAI] Genkit Error', err, 'ExerciseAI');
      setError('Falha ao gerar plano com o AI Coach. Tente as recomendações rápidas.');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [patientId, patient, painMap, availableEquipment, goals]);

  /**
   * Generate exercise recommendations using AI
   */
  const generateRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress(10);

    if (!patientId) {
      setError('Use a IA Assistente a partir do perfil de um paciente para recomendações personalizadas.');
      setLoading(false);
      return;
    }

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

      // Build request payload (only when patient exists)
      const payload = {
        patient: {
          id: patient!.id,
          name: patient?.name ?? '',
          age: patient!.age,
          gender: patient!.gender,
          mainCondition: patient!.mainCondition,
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
        patientId,
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
        description: `${data.exercises.length} exercícios sugeridos para ${patientName}`,
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
  }, [patientId, patientName, soapHistory, painMap, goals, availableEquipment, treatmentPhase, sessionCount]);

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
Programa de Exercícios - ${patientName}

RACIONAL:
${finalResult.programRationale}

EXERCÍCIOS:
${finalResult.exercises.map((ex, i) => `
${i + 1}. ${ex?.name ?? 'Exercício'}
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
  }, [finalResult, patientName]);

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
      <Tabs defaultValue="suggestions" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-muted p-1 rounded-lg">
            <TabsTrigger value="suggestions" className="px-4 py-2 rounded-md data-[state=active]:bg-background shadow-sm">
              Sugestões Rápidas
            </TabsTrigger>
            <TabsTrigger value="aicoach" className="px-4 py-2 rounded-md data-[state=active]:bg-background shadow-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Plano AI Coach (Novo)
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="suggestions" className="space-y-6">
          {/* Sem paciente: estado vazio com CTA para Pacientes */}
          {!hasPatient && (
            <Card className="border-2 border-dashed border-muted">
              <CardContent className="p-6">
                <EmptyState
                  icon={Users}
                  title="Recomendações personalizadas"
                  description="Para gerar exercícios com IA é preciso estar no perfil de um paciente. Abra um paciente e use a aba IA Assistente na evolução ou no perfil."
                  actionLabel="Ver Pacientes"
                  onAction={() => navigate('/patients')}
                />
              </CardContent>
            </Card>
          )}

          {/* Header Card (quando tem paciente ou sempre para manter título) */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                  <Dumbbell className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">IA de Exercícios</CardTitle>
                  <CardDescription>
                    {hasPatient
                      ? `Recomendações personalizadas para ${patientName}`
                      : 'Selecione um paciente na lista para habilitar a geração.'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block w-full">
                      <Button
                        onClick={generateRecommendations}
                        disabled={loading || !hasPatient}
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
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {!hasPatient
                      ? 'Abra a IA Assistente no perfil de um paciente para gerar recomendações.'
                      : 'Gera sugestões de exercícios com base no perfil e evolução do paciente.'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {loading && progress > 0 && !genkitResult && (
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
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">Erro ao gerar recomendações</h3>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {error === NO_PATIENT_ERROR_MSG ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setError(null)}>
                            Entendi
                          </Button>
                          <Button size="sm" onClick={() => navigate('/patients')}>
                            Ver Pacientes
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setError(null);
                            generateRecommendations();
                          }}
                        >
                          Tentar novamente
                        </Button>
                      )}
                    </div>
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
                          className={`cursor-pointer transition-all hover:shadow-md ${selectedExercises.has(exercise.exerciseId) ? 'ring-2 ring-primary' : ''
                            }`}
                          onClick={() => toggleExercise(exercise.exerciseId)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold">{exercise?.name ?? 'Exercício'}</h4>
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
        </TabsContent>

        <TabsContent value="aicoach" className="space-y-6">
          <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg text-white">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">AI Coach FisioFlow</CardTitle>
                  <CardDescription>
                    Geração de plano completo e estruturado usando Gemini 1.5 Flash.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={generateFullPlanWithGenkit}
                disabled={loading || !hasPatient}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Coach analisando caso...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar Plano Completo Estruturado
                  </>
                )}
              </Button>

              {loading && progress > 0 && (
                <div className="mt-4">
                  <Progress value={progress} className="h-2" color="amber" />
                  <p className="text-sm text-muted-foreground mt-2 text-center italic">
                    "O sucesso é a soma de pequenos esforços repetidos dia após dia..."
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {genkitResult && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-l-4 border-l-amber-500">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="mb-2 uppercase tracking-wider text-[10px]">Plano Estruturado</Badge>
                      <CardTitle className="text-xl text-amber-700 dark:text-amber-400">
                        {genkitResult.planName}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {genkitResult.durationWeeks} semanas
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Objetivo</h4>
                      <p className="text-sm">{genkitResult.goal}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Frequência</h4>
                      <p className="text-sm">{genkitResult.frequency}</p>
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg bg-green-50/30">
                    <h4 className="text-xs font-bold uppercase text-green-700 mb-1">Aquecimento (Warm-up)</h4>
                    <p className="text-sm">{genkitResult.warmup}</p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold flex items-center gap-2">
                      <Dumbbell className="h-4 w-4" />
                      Exercícios Prescritos
                    </h4>
                    {genkitResult.exercises.map((ex, i) => (
                      <div key={i} className="p-4 border rounded-xl hover:bg-muted/30 transition-colors relative group">
                        <div className="flex justify-between mb-2">
                          <h5 className="font-bold text-lg">{ex.name}</h5>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Ver Vídeo">
                            <Zap className="h-4 w-4 text-amber-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="flex flex-col items-center p-2 bg-background border rounded-lg">
                            <span className="text-[10px] text-muted-foreground uppercase">Séries</span>
                            <span className="font-bold">{ex.sets}</span>
                          </div>
                          <div className="flex flex-col items-center p-2 bg-background border rounded-lg">
                            <span className="text-[10px] text-muted-foreground uppercase">Reps</span>
                            <span className="font-bold">{ex.reps}</span>
                          </div>
                          <div className="flex flex-col items-center p-2 bg-background border rounded-lg">
                            <span className="text-[10px] text-muted-foreground uppercase">Descanso</span>
                            <span className="font-bold">{ex.rest}</span>
                          </div>
                        </div>
                        {ex.notes && (
                          <p className="text-sm text-muted-foreground border-l-2 pl-3 py-1">
                            {ex.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-3 border rounded-lg bg-blue-50/30">
                    <h4 className="text-xs font-bold uppercase text-blue-700 mb-1">Resfriamento (Cooldown)</h4>
                    <p className="text-sm">{genkitResult.cooldown}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                      Salvar como Plano de Home Care
                    </Button>
                    <Button variant="outline" onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(genkitResult, null, 2));
                      toast({ title: "Copiado!", description: "Dados do plano copiados." });
                    }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-xs">Powered by FisioFlow Intelligence (Gemini & Genkit)</p>
              <p className="text-muted-foreground text-[11px]">
                As recomendações de IA são ferramentas de suporte e não substituem o julgamento clínico do profissional.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ExerciseAI;
