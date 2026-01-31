/**
 * ExerciseCoach Component
 *
 * UI for FisioFlow real-time exercise coaching during telemedicine sessions.
 * Provides audio + video guidance, rep counting, and form analysis.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Pause,
  RotateCcw,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  Info,
  X,
  Dumbbell,
  Clock,
} from 'lucide-react';

import {
  ExerciseCoach as ExerciseCoachClass,
  COMMON_EXERCISES,
  type Exercise,
  type ExerciseSet,
  type Repetition,
} from '@/lib/ai/exercise-coach';
import { fisioLogger as logger } from '@/lib/errors/logger';
import type { LiveSessionCallbacks } from '@fisioflow/shared-api/firebase/ai/live-config';

// ============================================================================
// TYPES
// ============================================================================

interface FeedbackMessage {
  id: string;
  type: 'correction' | 'encouragement' | 'count' | 'instruction';
  content: string;
  timestamp: number;
}

interface ExerciseCoachProps {
  /** Exercise to coach */
  exercise?: Exercise;

  /** Predefined exercise ID */
  exerciseId?: string;

  /** Patient skill level */
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';

  /** Enable video analysis */
  enableVideo?: boolean;

  /** Allow modifications */
  allowModifications?: boolean;

  /** Strict mode */
  strictMode?: boolean;

  /** Session started callback */
  onSessionStart?: (sessionId: string) => void;

  /** Session ended callback */
  onSessionEnd?: (summary: unknown) => void;

  /** Rep completed callback */
  onRepComplete?: (rep: Repetition) => void;

  /** Set completed callback */
  onSetComplete?: (set: ExerciseSet) => void;

  /** Show compact mode */
  compact?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExerciseCoach({
  exercise: exerciseProp,
  exerciseId,
  skillLevel = 'intermediate',
  enableVideo = true,
  allowModifications = true,
  strictMode = false,
  onSessionStart,
  onSessionEnd,
  onRepComplete,
  onSetComplete,
  compact = false,
}: ExerciseCoachProps) {
  // ========================================================================
  // STATE
  // ========================================================================

  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(
    exerciseProp || (exerciseId ? COMMON_EXERCISES[exerciseId] : null)
  );
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(0);
  const [targetSets] = useState(currentExercise?.targetSets || 3);
  const [targetReps] = useState(currentExercise?.targetReps || 10);
  const [formScore, setFormScore] = useState(0);
  const [isVideoEnabled, setIsVideoEnabled] = useState(enableVideo);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackMessage[]>([]);
  const [completedSets, setCompletedSets] = useState<ExerciseSet[]>([]);
  const [totalReps, setTotalReps] = useState(0);
  const [averageFormScore, setAverageFormScore] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);

  const coachRef = useRef<ExerciseCoachClass | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationTimerRef = useRef<number | null>(null);
  const feedbackEndRef = useRef<HTMLDivElement>(null);

  // ========================================================================
  // CALLBACKS
  // ========================================================================

  const callbacks: LiveSessionCallbacks = {
    onAudioReceived: useCallback((audio) => {
      logger.debug('Audio received', { audio }, 'ExerciseCoach');
    }, []),

    onTranscript: useCallback((text, isFinal) => {
      setFeedback(prev => {
        const newFeedback = [...prev];
        newFeedback.push({
          id: `fb-${Date.now()}`,
          type: 'instruction',
          content: text,
          timestamp: Date.now(),
        });
        return newFeedback.slice(-20); // Keep last 20 messages
      });
    }, []),

    onSessionStart: useCallback(() => {
      setIsActive(true);
      setIsPaused(false);
    }, []),

    onSessionEnd: useCallback(() => {
      setIsActive(false);
      setIsPaused(false);

      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      // Get summary
      if (coachRef.current) {
        const summary = coachRef.current.generateSessionSummary();
        if (summary && onSessionEnd) {
          onSessionEnd(summary);
        }
      }
    }, [onSessionEnd]),

    onError: useCallback((error) => {
      logger.error('Exercise coach error', error, 'ExerciseCoach');
    }, []),

    onSpeakingStart: useCallback(() => {
      // Could add visual indicator
    }, []),

    onSpeakingEnd: useCallback(() => {
      // Could remove visual indicator
    }, []),

    onListeningStart: useCallback(() => {
      // Could add visual indicator
    }, []),

    onListeningEnd: useCallback(() => {
      // Could remove visual indicator
    }, []),

    onEvent: useCallback((event) => {
      logger.debug('Live API event', { event }, 'ExerciseCoach');
    }, []),
  };

  // ========================================================================
  // EFFECTS
  // ========================================================================

  // Initialize coach
  useEffect(() => {
    coachRef.current = new ExerciseCoach(callbacks);

    return () => {
      if (coachRef.current) {
        coachRef.current.stopSession();
      }
    };
  }, []);

  // Update exercise when prop changes
  useEffect(() => {
    if (exerciseProp) {
      setCurrentExercise(exerciseProp);
    } else if (exerciseId && COMMON_EXERCISES[exerciseId]) {
      setCurrentExercise(COMMON_EXERCISES[exerciseId]);
    }
  }, [exerciseProp, exerciseId]);

  // Update duration timer
  useEffect(() => {
    if (isActive && !isPaused) {
      durationTimerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [isActive, isPaused]);

  // Auto-scroll feedback
  useEffect(() => {
    feedbackEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feedback]);

  // Update metrics periodically
  useEffect(() => {
    if (isActive && coachRef.current) {
      const interval = setInterval(() => {
        const metrics = coachRef.current?.getMetrics();
        if (metrics) {
          setTotalReps(metrics.totalReps);
          setAverageFormScore(metrics.averageFormScore);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isActive]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const startSession = async () => {
    if (!coachRef.current || !currentExercise) return;

    try {
      const id = await coachRef.current.startSession({
        exercise: currentExercise,
        skillLevel,
        enableVideo: isVideoEnabled,
        allowModifications,
        strictMode,
      });

      setCurrentSet(1);
      setCurrentRep(0);
      setDuration(0);
      setFeedback([]);
      setCompletedSets([]);
      setTotalReps(0);
      setAverageFormScore(0);

      if (onSessionStart) {
        onSessionStart(id);
      }

      await coachRef.current.startRecording();
    } catch (error) {
      logger.error('Error starting session', error, 'ExerciseCoach');
    }
  };

  const stopSession = async () => {
    if (!coachRef.current) return;

    try {
      await coachRef.current.stopSession();
    } catch (error) {
      logger.error('Error stopping session', error, 'ExerciseCoach');
    }
  };

  const pauseSession = () => {
    setIsPaused(true);
  };

  const resumeSession = () => {
    setIsPaused(false);
  };

  const manualRepCount = async () => {
    if (!coachRef.current) return;

    try {
      await coachRef.current.countRep(formScore);

      // Update state
      setCurrentRep(prev => {
        const newRep = prev + 1;
        if (newRep >= targetReps) {
          // Set complete, will be updated by callback
        }
        return newRep;
      });
    } catch (error) {
      logger.error('Error counting rep', error, 'ExerciseCoach');
    }
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFormScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFormScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Precisa melhorar';
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  if (!currentExercise) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-slate-400">
            <Dumbbell className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Selecione um exercício</p>
            <p className="text-sm">Escolha um exercício para iniciar a sessão de coaching</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Exercise Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">{currentExercise.name}</h3>
                <p className="text-sm text-slate-500">
                  Série {currentSet} • {currentRep}/{targetReps} reps
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {isActive ? (
                <>
                  {isPaused ? (
                    <Button size="sm" onClick={resumeSession}>
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={pauseSession}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={manualRepCount}
                    disabled={isPaused}
                  >
                    + Rep
                  </Button>

                  <Button size="sm" variant="destructive" onClick={stopSession}>
                    Encerrar
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={startSession}>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar
                </Button>
              )}
            </div>
          </div>

          {/* Form Score */}
          {isActive && formScore > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Forma</span>
                <span className={`font-medium ${getFormScoreColor(formScore)}`}>
                  {formScore}%
                </span>
              </div>
              <Progress value={formScore} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Main Card */}
      <Card className="lg:col-span-2 shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                {currentExercise.name}
              </CardTitle>
              <CardDescription>
                {currentExercise.description}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Duration */}
              {isActive && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(duration)}
                </Badge>
              )}

              {/* Video Toggle */}
              <Button
                size="sm"
                variant={isVideoEnabled ? 'default' : 'outline'}
                onClick={toggleVideo}
                disabled={isActive}
              >
                {isVideoEnabled ? (
                  <Camera className="h-4 w-4" />
                ) : (
                  <CameraOff className="h-4 w-4" />
                )}
              </Button>

              {/* Mute Toggle */}
              <Button
                size="sm"
                variant={isMuted ? 'outline' : 'default'}
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="p-4">
          {/* Video Preview */}
          {isVideoEnabled && (
            <div className="mb-6 relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full rounded-lg bg-slate-900 aspect-video object-cover"
              />
              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-lg">
                  <Camera className="h-12 w-12 text-slate-400" />
                </div>
              )}
            </div>
          )}

          {/* Exercise Instructions */}
          {showInstructions && currentExercise.formCheckpoints.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-medium text-blue-900 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Pontos de Forma
                </h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowInstructions(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-2">
                {currentExercise.formCheckpoints.map((checkpoint, idx) => (
                  <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    {checkpoint}
                  </li>
                ))}
              </ul>
              {currentExercise.breathingInstructions && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Respiração:</strong> {currentExercise.breathingInstructions}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Progress Display */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Sets Progress */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Séries</span>
                <Badge variant="outline">
                  {currentSet}/{targetSets}
                </Badge>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: targetSets }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 h-2 rounded-full ${
                      idx < currentSet - 1
                        ? 'bg-green-500'
                        : idx === currentSet - 1
                        ? 'bg-teal-500'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Reps Progress */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Repetições</span>
                <Badge variant="outline">
                  {currentRep}/{targetReps}
                </Badge>
              </div>
              <Progress value={(currentRep / targetReps) * 100} className="h-2" />
            </div>
          </div>

          {/* Form Score */}
          {isActive && (
            <div className="mb-6 p-4 rounded-lg border-2 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Qualidade da Forma</p>
                  <p className={`text-2xl font-bold ${getFormScoreColor(formScore)}`}>
                    {formScore}%
                  </p>
                  <p className={`text-sm ${getFormScoreColor(formScore)}`}>
                    {getFormScoreLabel(formScore)}
                  </p>
                </div>
                <div className="text-right">
                  <TrendingUp className="h-8 w-8 text-slate-400 mb-1" />
                  <p className="text-sm text-slate-500">
                    Média: {averageFormScore.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Stream */}
          <div className="border rounded-lg">
            <div className="flex items-center justify-between p-3 border-b bg-slate-50">
              <h3 className="font-medium text-slate-700">Feedback em Tempo Real</h3>
              <Badge variant="secondary">
                {feedback.length} mensagens
              </Badge>
            </div>

            <ScrollArea className="h-48 p-4">
              <div className="space-y-2">
                {feedback.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-slate-400">
                    <Info className="h-6 w-6 mb-2" />
                    <p className="text-sm">
                      {isActive
                        ? 'O feedback aparecerá aqui...'
                        : 'Inicie a sessão para receber feedback'}
                    </p>
                  </div>
                ) : (
                  feedback.map(msg => {
                    const colors = {
                      correction: 'bg-red-50 border-red-200 text-red-800',
                      encouragement: 'bg-green-50 border-green-200 text-green-800',
                      count: 'bg-blue-50 border-blue-200 text-blue-800',
                      instruction: 'bg-slate-50 border-slate-200 text-slate-800',
                    };

                    const icons = {
                      correction: <AlertCircle className="h-4 w-4" />,
                      encouragement: <Award className="h-4 w-4" />,
                      count: <CheckCircle2 className="h-4 w-4" />,
                      instruction: <Info className="h-4 w-4" />,
                    };

                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg border ${colors[msg.type]}`}
                      >
                        <div className="flex items-start gap-2">
                          {icons[msg.type]}
                          <p className="text-sm flex-1">{msg.content}</p>
                          <span className="text-xs opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={feedbackEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-center gap-4">
            {isActive ? (
              <>
                {isPaused ? (
                  <Button
                    size="lg"
                    onClick={resumeSession}
                    className="rounded-full w-16 h-16"
                  >
                    <Play className="h-6 w-6" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={pauseSession}
                    className="rounded-full w-16 h-16"
                  >
                    <Pause className="h-6 w-6" />
                  </Button>
                )}

                <Button
                  size="lg"
                  onClick={manualRepCount}
                  disabled={isPaused}
                  className="rounded-full w-20 h-20 text-lg font-semibold"
                >
                  + Rep
                  <span className="ml-2 text-sm font-normal">
                    ({currentRep}/{targetReps})
                  </span>
                </Button>

                <Button
                  size="lg"
                  variant="destructive"
                  onClick={stopSession}
                  className="rounded-full w-16 h-16"
                >
                  <RotateCcw className="h-6 w-6" />
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                onClick={startSession}
                className="rounded-full w-20 h-20 text-lg font-semibold gap-2"
              >
                <Play className="h-6 w-6" />
                Iniciar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5" />
            Estatísticas
          </CardTitle>
          <CardDescription>
            Desempenho durante a sessão
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className="p-4 space-y-4">
          {/* Total Reps */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Total de Repetições</p>
            <p className="text-3xl font-bold text-slate-900">{totalReps}</p>
          </div>

          {/* Average Form Score */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Média de Forma</p>
            <p className={`text-3xl font-bold ${getFormScoreColor(averageFormScore)}`}>
              {averageFormScore.toFixed(0)}%
            </p>
            <p className={`text-sm mt-1 ${getFormScoreColor(averageFormScore)}`}>
              {getFormScoreLabel(averageFormScore)}
            </p>
          </div>

          {/* Completed Sets */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Séries Concluídas</p>
            <p className="text-3xl font-bold text-slate-900">
              {completedSets.length}/{targetSets}
            </p>
          </div>

          {/* Skill Level Badge */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-2">Nível</p>
            <Badge
              variant="outline"
              className={
                skillLevel === 'beginner'
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : skillLevel === 'intermediate'
                  ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                  : 'bg-red-100 text-red-700 border-red-200'
              }
            >
              {skillLevel === 'beginner' && 'Iniciante'}
              {skillLevel === 'intermediate' && 'Intermediário'}
              {skillLevel === 'advanced' && 'Avançado'}
            </Badge>
          </div>

          {/* Video Status */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Análise de Vídeo</p>
              {isVideoEnabled ? (
                <Badge variant="outline" className="gap-1">
                  <Camera className="h-3 w-3" />
                  Ativada
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <CameraOff className="h-3 w-3" />
                  Desativada
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ExerciseCoach;
