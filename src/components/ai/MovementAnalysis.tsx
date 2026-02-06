/**
 * MovementAnalysis Component
 *
 * Provides AI-powered exercise form analysis using video input.
 * Uses Gemini 2.5 Pro to analyze patient exercise form compared to demo videos.
 *
 * Features:
 * - Video upload and recording
 * - Real-time analysis progress
 * - Form quality scoring (posture, ROM, control, tempo, breathing)
 * - Deviation detection with timestamps
 * - Safety concern alerts
 * - Repetition counting
 * - Comparison with demo videos
 * - Historical progress tracking
 *
 * @module components/ai/MovementAnalysis
 */

import { useState, useCallback, useRef, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {

  Video,
  Upload,
  Camera,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Target,
  Shield,
  TrendingUp
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { storage, functions } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { analyzeMovement } from '@/services/ai/firebaseAIService';

// ============================================================================
// TYPES
// ============================================================================

export interface MovementAnalysisProps {
  /** Patient ID */
  patientId: string;
  /** Exercise ID */
  exerciseId: string;
  /** Exercise name */
  exerciseName: string;
  /** Demo video URL (optional) */
  demoVideoUrl?: string;
  /** Expected repetitions */
  expectedReps?: number;
  /** Focus areas for analysis */
  focusAreas?: string[];
  /** Language */
  language?: 'pt-BR' | 'en';
  /** Callback when analysis is complete */
  onAnalysisComplete?: (result: MovementAnalysisResult) => void;
}

interface FormQualityScore {
  overall: number;
  posture: number;
  rangeOfMotion: number;
  control: number;
  tempo: number;
  breathing: number;
}

interface ExerciseFormDeviation {
  timestamp: number;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  bodyPart: string;
  correction: string;
}

interface SafetyConcern {
  type: 'joint_overload' | 'spinal_compression' | 'loss_of_balance' | 'excessive_speed' | 'pain_indicator';
  severity: 'warning' | 'danger';
  description: string;
  timestamp: number;
  recommendation: string;
}

interface MovementAnalysisResult {
  exerciseId: string;
  exerciseName: string;
  patientId: string;
  analysisDate: string;
  demoVideoUrl?: string;
  patientVideoUrl: string;
  patientVideoDuration: number;
  formQuality: FormQualityScore;
  deviations: ExerciseFormDeviation[];
  safetyConcerns: SafetyConcern[];
  repetitions: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  progression: string;
  modelUsed: string;
  processingTime: number;
  confidence: number;
}

interface AnalysisProgress {
  stage: 'uploading' | 'analyzing' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MovementAnalysis({
  patientId,
  exerciseId,
  exerciseName,
  demoVideoUrl,
  expectedReps,
  focusAreas = [],
  language = 'pt-BR',
  onAnalysisComplete
}: MovementAnalysisProps) {
  // State management
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MovementAnalysisResult | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Video ref
  const videoRef = useRef<HTMLVideoElement>(null);

  /**
   * Handle video file selection
   */
  const handleVideoSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo de vídeo',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 100MB for Gemini Pro)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O vídeo deve ter no máximo 100MB',
        variant: 'destructive',
      });
      return;
    }

    setVideoFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);

    // Reset previous analysis
    setAnalysisResult(null);
    setError(null);

    toast({
      title: 'Vídeo carregado',
      description: `${file.name} pronto para análise`,
    });
  }, []);

  /**
   * Handle camera recording
   */
  const handleRecordVideo = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8',
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], 'recording.webm', { type: 'video/webm' });
        setVideoFile(file);

        const url = URL.createObjectURL(blob);
        setVideoPreviewUrl(url);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        toast({
          title: 'Gravação concluída',
          description: 'Vídeo pronto para análise',
        });
      };

      mediaRecorder.start();

      // Auto-stop after 60 seconds (max for analysis)
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 60000);

      toast({
        title: 'Gravando...',
        description: 'A gravação será encerrada automaticamente em 60 segundos',
      });

    } catch (err) {
      logger.error('[MovementAnalysis] Error recording', err, 'MovementAnalysis');
      toast({
        title: 'Erro ao acessar câmera',
        description: 'Verifique as permissões da câmera',
        variant: 'destructive',
      });
    }
  }, []);

  /**
   * Analyze exercise form
   */
  const analyzeForm = useCallback(async () => {
    if (!videoFile) {
      toast({
        title: 'Nenhum vídeo selecionado',
        description: 'Carregue ou grave um vídeo primeiro',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);

    // Initial progress
    setAnalysisProgress({
      stage: 'uploading',
      progress: 10,
      message: language === 'pt-BR' ? 'Fazendo upload do vídeo...' : 'Uploading video...',
    });

    try {
      // 1. Upload video to Firebase Storage
      const storagePath = `movement_analysis/${patientId}/${Date.now()}_${videoFile.name}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, videoFile);
      const patientVideoUrl = await getDownloadURL(storageRef);

      setAnalysisProgress({
        stage: 'analyzing',
        progress: 40,
        message: language === 'pt-BR' ? 'Analisando movimento com IA...' : 'Analyzing movement with AI...',
      });

      // 2. Call Cloud Function for analysis (via unified AI service)
      const data = await analyzeMovement({
        videoData: patientVideoUrl,
        patientId,
        context: JSON.stringify({ exerciseId, exerciseName, demoVideoUrl, expectedReps, focusAreas }),
      }) as MovementAnalysisResult;

      setAnalysisProgress({
        stage: 'processing',
        progress: 90,
        message: language === 'pt-BR' ? 'Processando resultados...' : 'Processing results...',
      });

      const data = result.data as MovementAnalysisResult;
      setAnalysisResult(data);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }

      setAnalysisProgress({
        stage: 'complete',
        progress: 100,
        message: language === 'pt-BR' ? 'Análise concluída!' : 'Analysis complete!',
      });

      toast({
        title: language === 'pt-BR' ? 'Análise Concluída' : 'Analysis Complete',
        description: language === 'pt-BR' 
          ? 'O movimento foi analisado com sucesso.' 
          : 'Movement analyzed successfully.',
      });
    } catch (err) {
      logger.error('[MovementAnalysis] Error', err, 'MovementAnalysis');
      const errorMessage = err instanceof Error ? err.message : language === 'pt-BR'
        ? 'Erro ao analisar movimento'
        : 'Error analyzing movement';
      setError(errorMessage);
      setAnalysisProgress({
        stage: 'error',
        progress: 0,
        message: errorMessage,
      });
      toast({
        title: language === 'pt-BR' ? 'Erro na análise' : 'Analysis error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      // Clear progress after a delay
      setTimeout(() => setAnalysisProgress(null), 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFile, patientId, exerciseId, exerciseName, demoVideoUrl, expectedReps, focusAreas, language, onAnalysisComplete]);

  /**
   * Reset analysis
   */
  const resetAnalysis = useCallback(() => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
    setAnalysisProgress(null);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
  }, [videoPreviewUrl]);

  /**
   * Toggle video playback
   */
  const _togglePlayback = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  /**
   * Get score color
   */
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  /**
   * Get severity color
   */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
      case 'medium':
        return 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20';
      case 'high':
        return 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20';
      case 'critical':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
      default:
        return '';
    }
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isPTBR = language === 'pt-BR';

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-cyan-200 dark:border-cyan-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-lg">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">
                {isPTBR ? 'Análise de Movimento' : 'Movement Analysis'}
              </CardTitle>
              <CardDescription>
                {exerciseName} - {patientId}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Video Upload/Recording */}
      {!videoFile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isPTBR ? 'Carregar Vídeo do Exercício' : 'Upload Exercise Video'}
            </CardTitle>
            <CardDescription>
              {isPTBR
                ? 'Carregue um vídeo ou grave diretamente da câmera'
                : 'Upload a video or record directly from camera'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                  id="video-upload"
                />
                <label htmlFor="video-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-medium mb-1">
                    {isPTBR ? 'Clique para fazer upload' : 'Click to upload'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isPTBR ? 'Máximo 100MB' : 'Max 100MB'}
                  </p>
                </label>
              </div>

              <Button
                variant="outline"
                className="h-full min-h-[150px] flex flex-col gap-2"
                onClick={handleRecordVideo}
              >
                <Camera className="h-12 w-12" />
                <span>{isPTBR ? 'Gravar da Câmera' : 'Record from Camera'}</span>
                <span className="text-xs text-muted-foreground">
                  {isPTBR ? 'Máx. 60 segundos' : 'Max 60 seconds'}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Preview */}
      {videoFile && videoPreviewUrl && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {isPTBR ? 'Vídeo Carregado' : 'Uploaded Video'}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetAnalysis}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {isPTBR ? 'Trocar' : 'Change'}
                </Button>
                <Button
                  onClick={analyzeForm}
                  disabled={loading}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isPTBR ? 'Analisando...' : 'Analyzing...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isPTBR ? 'Analisar Movimento' : 'Analyze Movement'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoPreviewUrl}
                className="w-full h-full object-contain"
                controls
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Progress */}
      {analysisProgress && analysisProgress.stage !== 'complete' && (
        <Card className="border-primary/50">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="font-medium">{analysisProgress.message}</p>
              </div>
              <Progress value={analysisProgress.progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                {analysisProgress.progress}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold">
                  {isPTBR ? 'Erro na análise' : 'Analysis Error'}
                </h3>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={analyzeForm}
                >
                  {isPTBR ? 'Tentar novamente' : 'Try Again'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <>
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {isPTBR ? 'Pontuação de Qualidade' : 'Quality Score'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <p className="text-6xl font-bold mb-2">
                  <span className={getScoreColor(analysisResult.formQuality.overall)}>
                    {analysisResult.formQuality.overall}
                  </span>
                  <span className="text-3xl text-muted-foreground">/100</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPTBR ? 'Pontuação Geral' : 'Overall Score'}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                <ScoreItem
                  label={isPTBR ? 'Postura' : 'Posture'}
                  score={analysisResult.formQuality.posture}
                />
                <ScoreItem
                  label={isPTBR ? 'ADM' : 'ROM'}
                  score={analysisResult.formQuality.rangeOfMotion}
                />
                <ScoreItem
                  label={isPTBR ? 'Controle' : 'Control'}
                  score={analysisResult.formQuality.control}
                />
                <ScoreItem
                  label={isPTBR ? 'Tempo' : 'Tempo'}
                  score={analysisResult.formQuality.tempo}
                />
                <ScoreItem
                  label={isPTBR ? 'Respiração' : 'Breathing'}
                  score={analysisResult.formQuality.breathing}
                />
              </div>

              <div className="mt-4 p-4 bg-muted/50 rounded">
                <p className="text-sm">
                  <strong>{isPTBR ? 'Repetições:' : 'Repetitions:'}</strong> {analysisResult.repetitions}
                  {expectedReps && ` / ${expectedReps} ${isPTBR ? 'esperadas' : 'expected'}`}
                </p>
                <p className="text-sm mt-1">
                  <strong>{isPTBR ? 'Duração:' : 'Duration:'}</strong> {Math.round(analysisResult.patientVideoDuration)}s
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{isPTBR ? 'Resumo' : 'Summary'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm bg-muted/50 p-3 rounded">
                {analysisResult.summary}
              </p>
            </CardContent>
          </Card>

          {/* Strengths */}
          {analysisResult.strengths.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  {isPTBR ? 'Pontos Fortes' : 'Strengths'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysisResult.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Deviations */}
          {analysisResult.deviations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  {isPTBR ? 'Desvios Identificados' : 'Identified Deviations'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3 pr-4">
                    {analysisResult.deviations.map((deviation, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border ${getSeverityColor(deviation.severity)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline">{deviation.severity}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(deviation.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{deviation.issue}</p>
                        <p className="text-xs text-muted-foreground mb-1">
                          {isPTBR ? 'Área:' : 'Area:'} {deviation.bodyPart}
                        </p>
                        <p className="text-xs">
                          <strong>{isPTBR ? 'Correção:' : 'Correction:'}</strong> {deviation.correction}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Safety Concerns */}
          {analysisResult.safetyConcerns.length > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <Shield className="h-5 w-5" />
                  {isPTBR ? 'Preocupações de Segurança' : 'Safety Concerns'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResult.safetyConcerns.map((concern, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg ${
                        concern.severity === 'danger'
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : 'bg-amber-50 dark:bg-amber-900/20'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className={`h-4 w-4 mt-0.5 ${
                          concern.severity === 'danger' ? 'text-red-600' : 'text-amber-600'
                        }`} />
                        <div className="flex-1">
                          <Badge variant={concern.severity === 'danger' ? 'destructive' : 'secondary'} className="mb-1">
                            {concern.type}
                          </Badge>
                          <p className="text-sm">{concern.description}</p>
                          <p className="text-xs mt-1">
                            <strong>{isPTBR ? 'Recomendação:' : 'Recommendation:'}</strong> {concern.recommendation}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(concern.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Areas for Improvement */}
          {analysisResult.improvements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  {isPTBR ? 'Pontos de Melhoria' : 'Areas for Improvement'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysisResult.improvements.map((improvement, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Progression */}
          <Card>
            <CardHeader>
              <CardTitle>{isPTBR ? 'Progressão Sugerida' : 'Suggested Progression'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm bg-muted/50 p-3 rounded">
                {analysisResult.progression}
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={resetAnalysis}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {isPTBR ? 'Nova Análise' : 'New Analysis'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const text = `${isPTBR ? 'ANÁLISE DE MOVIMENTO' : 'MOVEMENT ANALYSIS'}\n${exerciseName}\n\n${isPTBR ? 'Pontuação:' : 'Score'} ${analysisResult.formQuality.overall}/100\n\n${analysisResult.summary}`;
                navigator.clipboard.writeText(text);
                toast({
                  title: isPTBR ? 'Copiado!' : 'Copied!',
                  description: isPTBR ? 'Resultado copiado para a área de transferência' : 'Result copied to clipboard',
                });
              }}
            >
              {isPTBR ? 'Copiar Resultado' : 'Copy Result'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ScoreItemProps {
  label: string;
  score: number;
}

function ScoreItem({ label, score }: ScoreItemProps) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-600';
    if (s >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="text-center p-3 bg-muted/30 rounded">
      <p className="text-lg font-bold">{score}</p>
      <p className={`text-xs ${getColor(score)}`}>{label}</p>
    </div>
  );
}

export default MovementAnalysis;
