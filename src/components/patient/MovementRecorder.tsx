/**
 * MovementRecorder - Componente de gravação de vídeo para análise de movimento
 * Parte do FASE 3 - Análise Multimodal de Movimento
 *
 * Recursos:
 * - Gravação de vídeo da câmera
 * - Upload e análise com IA
 * - Preview ao vivo
 * - Controles de gravação
 * - Feedback de progresso
 *
 * @module components/patient/MovementRecorder
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

  Video,
  VideoOff,
  Mic,
  MicOff,
  Circle,
  Square,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Eye,
  Download,
  Trash2,
  Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';

// Tipos
export interface MovementRecorderProps {
  patientId: string;
  exerciseId: string;
  exerciseName: string;
  demoVideoUrl?: string;
  expectedReps?: number;
  maxDuration?: number; // em segundos, padrão 60
  onAnalysisComplete?: (result: AnalysisResult) => void;
  onError?: (error: Error) => void;
  language?: 'pt-BR' | 'en';
  className?: string;
}

export interface AnalysisResult {
  formQuality: {
    overall: number;
    posture: number;
    rangeOfMotion: number;
    control: number;
    tempo: number;
    breathing: number;
  };
  deviations: Array<{
    timestamp: number;
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    bodyPart: string;
    correction: string;
  }>;
  safetyConcerns: Array<{
    type: string;
    severity: 'warning' | 'danger';
    description: string;
    timestamp: number;
    recommendation: string;
  }>;
  summary: string;
  strengths: string[];
  improvements: string[];
  progression: string;
}

type RecordingState = 'idle' | 'preview' | 'recording' | 'paused' | 'uploading' | 'analyzing' | 'complete' | 'error';

interface AnalysisProgress {
  stage: string;
  progress: number;
  message: string;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function MovementRecorder({
  patientId,
  exerciseId,
  exerciseName,
  demoVideoUrl,
  expectedReps,
  maxDuration = 60,
  onAnalysisComplete,
  onError,
  language = 'pt-BR',
  className
}: MovementRecorderProps) {

  // Estados
  const [state, setState] = useState<RecordingState>('idle');
  const [progress, setProgress] = useState<AnalysisProgress>({ stage: '', progress: 0, message: '' });
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasAudio, setHasAudio] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Labels traduzíveis
  const labels = {
    title: language === 'pt-BR' ? 'Gravação de Movimento' : 'Movement Recording',
    description: language === 'pt-BR'
      ? 'Grave um vídeo executando o exercício para análise de forma com IA'
      : 'Record a video performing the exercise for AI form analysis',
    startRecording: language === 'pt-BR' ? 'Iniciar Gravação' : 'Start Recording',
    stopRecording: language === 'pt-BR' ? 'Parar Gravação' : 'Stop Recording',
    pauseRecording: language === 'pt-BR' ? 'Pausar' : 'Pause',
    resumeRecording: language === 'pt-BR' ? 'Continuar' : 'Resume',
    retake: language === 'pt-BR' ? 'Gravar Novamente' : 'Retake',
    analyze: language === 'pt-BR' ? 'Analisar com IA' : 'Analyze with AI',
    download: language === 'pt-BR' ? 'Baixar Vídeo' : 'Download Video',
    delete: language === 'pt-BR' ? 'Excluir' : 'Delete',
    preview: language === 'pt-BR' ? 'Visualizar' : 'Preview',
    cameraUnavailable: language === 'pt-BR' ? 'Câmera indisponível' : 'Camera unavailable',
    grantPermission: language === 'pt-BR'
      ? 'Por favor, permita o acesso à câmera para gravar o exercício'
      : 'Please allow camera access to record the exercise',
    maxDurationWarning: language === 'pt-BR'
      ? `Tempo máximo de gravação: ${maxDuration} segundos`
      : `Maximum recording time: ${maxDuration} seconds`,
    analyzing: language === 'pt-BR' ? 'Analisando...' : 'Analyzing...',
    analysisComplete: language === 'pt-BR' ? 'Análise Concluída!' : 'Analysis Complete!',
    analysisFailed: language === 'pt-BR' ? 'Análise Falhou' : 'Analysis Failed',
    selectCamera: language === 'pt-BR' ? 'Selecionar Câmera' : 'Select Camera',
    toggleAudio: language === 'pt-BR' ? 'Áudio' : 'Audio',
    exerciseInfo: language === 'pt-BR' ? 'Informações do Exercício' : 'Exercise Information',
    expectedReps: language === 'pt-BR' ? 'Repetições esperadas' : 'Expected reps',
    demoAvailable: language === 'pt-BR' ? 'Vídeo demo disponível' : 'Demo video available'
  };

  // ============================================================================
  // EFEITOS
  // ============================================================================

  useEffect(() => {
    return () => {
      // Cleanup
      stopStream();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [recordedUrl]);

  // ============================================================================
  // FUNÇÕES DE CÂMERA
  // ============================================================================

  const startCamera = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: hasAudio
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState('preview');

    } catch (error) {
      logger.error('Erro ao acessar câmera', error, 'MovementRecorder');
      toast.error(labels.cameraUnavailable);
      setState('error');
      onError?.(error as Error);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleAudio = () => {
    setHasAudio(!hasAudio);
  };

  // ============================================================================
  // FUNÇÕS DE GRAVAÇÃO
  // ============================================================================

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });

      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedBlob(blob);
        setRecordedChunks(chunks);

        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);

        setState('complete');
      };

      mediaRecorder.start(1000); // Gravar em chunks de 1 segundo
      setState('recording');
      setRecordingTime(0);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

    } catch (error) {
      logger.error('Erro ao iniciar gravação', error, 'MovementRecorder');
      toast.error(language === 'pt-BR' ? 'Erro ao iniciar gravação' : 'Error starting recording');
    }
  }, [hasAudio, maxDuration, language]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopStream();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const handleRetake = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordedChunks([]);
    setRecordingTime(0);
    setAnalysisResult(null);
    startCamera();
  };

  const handleDownload = () => {
    if (!recordedBlob) return;

    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exercicio-${exerciseId}-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // FUNÇÕES DE ANÁLISE
  // ============================================================================

  const handleAnalyze = async () => {
    if (!recordedBlob) return;

    setState('uploading');
    setProgress({ stage: 'uploading', progress: 10, message: 'Fazendo upload...' });

    try {
      // Importar dinamicamente para evitar carregar no início
      const { analyzeExerciseForm } = await import('@/lib/ai/movement-analysis');

      const file = new File([recordedBlob], `exercise-${exerciseId}.webm`, { type: 'video/webm' });

      const result = await analyzeExerciseForm(
        file,
        {
          patientId,
          exerciseId,
          exerciseName,
          demoVideoUrl,
          expectedReps,
          language
        },
        (progress) => {
          setProgress(progress);
          if (progress.stage === 'analyzing') {
            setState('analyzing');
          }
        }
      );

      setAnalysisResult({
        formQuality: result.formQuality,
        deviations: result.deviations,
        safetyConcerns: result.safetyConcerns,
        summary: result.summary,
        strengths: result.strengths,
        improvements: result.improvements,
        progression: result.progression
      });

      setState('complete');
      toast.success(labels.analysisComplete);
      onAnalysisComplete?.(analysisResult!);

    } catch (error) {
      logger.error('Erro na análise', error, 'MovementRecorder');
      setState('error');
      toast.error(labels.analysisFailed);
      onError?.(error as Error);
    }
  };

  // ============================================================================
  // RENDERIZAÇÃO
  // ============================================================================

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      case 'critical':
      case 'danger': return 'bg-red-500/10 text-red-700 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  return (
    <div className={cn('w-full max-w-4xl mx-auto space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {labels.title}
          </CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </CardHeader>
      </Card>

      {/* Informações do exercício */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{exerciseName}</h3>
              {expectedReps && (
                <p className="text-sm text-muted-foreground">
                  {labels.expectedReps}: {expectedReps}
                </p>
              )}
            </div>
            {demoVideoUrl && (
              <Badge variant="outline" className="text-xs">
                {labels.demoAvailable}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Área principal de vídeo */}
      <Card>
        <CardContent className="p-6">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {state === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                <div className="text-center space-y-4">
                  <Video className="h-16 w-16 mx-auto text-muted-foreground" />
                  <Button onClick={startCamera} size="lg">
                    <Camera className="h-5 w-5 mr-2" />
                    {language === 'pt-BR' ? 'Iniciar Câmera' : 'Start Camera'}
                  </Button>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {labels.grantPermission}
                  </p>
                </div>
              </div>
            )}

            {(state === 'preview' || state === 'recording' || state === 'paused') && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {state === 'recording' && (
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                    <Badge variant="destructive" className="animate-pulse">
                      REC {formatTime(recordingTime)}
                    </Badge>
                  </div>
                )}
                {state === 'paused' && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="secondary">PAUSED</Badge>
                  </div>
                )}
              </>
            )}

            {state === 'complete' && recordedUrl && (
              <video
                src={recordedUrl}
                controls
                className="w-full h-full object-contain"
              />
            )}

            {state === 'uploading' || state === 'analyzing' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur">
                <div className="text-center space-y-4 max-w-md">
                  <div className="h-16 w-16 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <div>
                    <p className="font-semibold">{labels.analyzing}</p>
                    <p className="text-sm text-muted-foreground mt-1">{progress.message}</p>
                  </div>
                  <Progress value={progress.progress} className="w-full" />
                </div>
              </div>
            ) : null}

            {state === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                <div className="text-center space-y-4">
                  <AlertTriangle className="h-16 w-16 mx-auto text-destructive" />
                  <p className="text-destructive font-medium">
                    {language === 'pt-BR' ? 'Erro ao processar vídeo' : 'Error processing video'}
                  </p>
                  <Button onClick={handleRetake} variant="outline">
                    <RotateCw className="h-4 w-4 mr-2" />
                    {labels.retake}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              {state === 'preview' && (
                <>
                  <Button onClick={startRecording} size="lg">
                    <Circle className="h-4 w-4 mr-2 fill-current" />
                    {labels.startRecording}
                  </Button>
                  <Button onClick={toggleAudio} variant="outline">
                    {hasAudio ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                </>
              )}

              {state === 'recording' && (
                <>
                  <Button onClick={stopRecording} variant="destructive" size="lg">
                    <Square className="h-4 w-4 mr-2" />
                    {labels.stopRecording}
                  </Button>
                  <Button onClick={pauseRecording} variant="outline">
                    <Pause className="h-4 w-4" />
                  </Button>
                </>
              )}

              {state === 'paused' && (
                <>
                  <Button onClick={resumeRecording} size="lg">
                    <Circle className="h-4 w-4 mr-2 fill-current" />
                    {labels.resumeRecording}
                  </Button>
                  <Button onClick={stopRecording} variant="destructive">
                    <Square className="h-4 w-4 mr-2" />
                    {labels.stopRecording}
                  </Button>
                </>
              )}

              {state === 'complete' && (
                <>
                  <Button onClick={handleAnalyze} disabled={!recordedBlob}>
                    <Upload className="h-4 w-4 mr-2" />
                    {labels.analyze}
                  </Button>
                  <Button onClick={handleRetake} variant="outline">
                    <RotateCw className="h-4 w-4 mr-2" />
                    {labels.retake}
                  </Button>
                  <Button onClick={handleDownload} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    {labels.download}
                  </Button>
                </>
              )}
            </div>

            {state === 'recording' && (
              <Alert className="max-w-xs">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {labels.maxDurationWarning}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultados da análise */}
      {analysisResult && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Pontuação geral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                {language === 'pt-BR' ? 'Análise de Forma' : 'Form Analysis'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{language === 'pt-BR' ? 'Geral' : 'Overall'}</p>
                  <p className="text-2xl font-bold">{analysisResult.formQuality.overall}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{language === 'pt-BR' ? 'Postura' : 'Posture'}</p>
                  <p className="text-2xl font-bold">{analysisResult.formQuality.posture}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{language === 'pt-BR' ? 'Amplitude' : 'ROM'}</p>
                  <p className="text-2xl font-bold">{analysisResult.formQuality.rangeOfMotion}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{language === 'pt-BR' ? 'Controle' : 'Control'}</p>
                  <p className="text-2xl font-bold">{analysisResult.formQuality.control}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{language === 'pt-BR' ? 'Tempo' : 'Tempo'}</p>
                  <p className="text-2xl font-bold">{analysisResult.formQuality.tempo}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{language === 'pt-BR' ? 'Respiração' : 'Breathing'}</p>
                  <p className="text-2xl font-bold">{analysisResult.formQuality.breathing}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desvios */}
          {analysisResult.deviations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{language === 'pt-BR' ? 'Desvios Identificados' : 'Identified Deviations'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisResult.deviations.map((deviation, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                      <Badge className={getSeverityColor(deviation.severity)}>
                        {deviation.severity}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{deviation.issue}</p>
                        <p className="text-sm text-muted-foreground">{deviation.correction}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(deviation.timestamp)} - {deviation.bodyPart}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alertas de segurança */}
          {analysisResult.safetyConcerns.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  {language === 'pt-BR' ? 'Alertas de Segurança' : 'Safety Alerts'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResult.safetyConcerns.map((concern, i) => (
                    <Alert key={i} variant={concern.severity === 'danger' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-medium">{concern.description}</p>
                        <p className="text-sm mt-1">{concern.recommendation}</p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumo */}
          <Card>
            <CardHeader>
              <CardTitle>{language === 'pt-BR' ? 'Resumo' : 'Summary'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{analysisResult.summary}</p>

              {analysisResult.strengths.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {language === 'pt-BR' ? 'Pontos Fortes' : 'Strengths'}
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {analysisResult.strengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.improvements.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    {language === 'pt-BR' ? 'Pontos de Melhoria' : 'Areas for Improvement'}
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {analysisResult.improvements.map((improvement, i) => (
                      <li key={i}>{improvement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default MovementRecorder;
