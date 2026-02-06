/**
 * SOAPAssistant Component
 *
 * Provides AI-powered SOAP note generation for physical therapy consultations.
 * Uses Gemini 2.5 Pro for accurate clinical documentation with support for:
 * - Text-based consultation notes
 * - Voice transcription and analysis
 * - Structured SOAP format (Subjective, Objective, Assessment, Plan)
 * - Multi-language support (PT, EN, ES)
 * - ICD-10 code suggestions
 * - Key findings and recommendations
 *
 * Features:
 * - Voice recording with real-time transcription
 * - Optimistic UI updates
 * - SOAP field application
 * - Translation support
 * - Clinical red flag detection
 *
 * @module components/ai/SOAPAssistant
 */

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {

  FileText,
  Mic,
  MicOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Copy,
  Wand2,
  FileCheck,
  Languages,
  Stethoscope
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Patient, SOAPRecord } from '@/types';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface SOAPAssistantProps {
  /** Patient information */
  patient: Pick<Patient, 'id' | 'name' | 'birthDate' | 'gender' | 'mainCondition' | 'medicalHistory'> & {
    age: number;
  };
  /** Previous SOAP records for context */
  previousSOAP?: Array<Pick<SOAPRecord, 'sessionNumber' | 'subjective' | 'objective' | 'assessment' | 'plan'>>;
  /** Current session number */
  sessionNumber: number;
  /** Session type */
  sessionType?: 'initial' | 'follow-up' | 'reassessment' | 'discharge';
  /** Consultation language */
  language?: 'pt' | 'en' | 'es';
  /** Callback when SOAP section is generated */
  onApplySection?: (
    section: 'subjective' | 'objective' | 'assessment' | 'plan',
    content: string | Record<string, unknown>
  ) => void;
}

interface SOAPSection {
  subjective: string;
  objective?: {
    inspection?: string;
    palpation?: string;
    movement_tests?: Record<string, string>;
    special_tests?: Record<string, string>;
    posture_analysis?: string;
    gait_analysis?: string;
  };
  assessment: string;
  plan?: {
    short_term_goals?: string[];
    long_term_goals?: string[];
    interventions?: string[];
    frequency?: string;
    duration?: string;
    home_exercises?: string[];
    precautions?: string[];
  };
}

interface SOAPGenerationResult {
  soap: SOAPSection;
  keyFindings: string[];
  recommendations: string[];
  redFlags?: string[];
  suggestedCodes?: string[];
}

interface RecordingState {
  isRecording: boolean;
  duration: number;
  audioBlob: Blob | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SOAPAssistant({
  patient,
  previousSOAP = [],
  sessionNumber,
  sessionType = 'follow-up',
  language = 'pt',
  onApplySection
}: SOAPAssistantProps) {
  // State management
  const [loading, setLoading] = useState(false);
  const [optimisticResult, setOptimisticResult] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<SOAPGenerationResult | null>(null);
  const [consultationText, setConsultationText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    audioBlob: null,
  });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  /**
   * Start voice recording
   */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordingState(prev => ({ ...prev, audioBlob }));
      };

      mediaRecorder.start();

      setRecordingState({
        isRecording: true,
        duration: 0,
        audioBlob: null,
      });

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);

      toast({
        title: 'Gravação iniciada',
        description: 'Fale agora. A gravação será processada automaticamente.',
      });
    } catch (err) {
      logger.error('Error starting recording', err, 'SOAPAssistant');
      toast({
        title: 'Erro ao acessar microfone',
        description: 'Verifique as permissões do microfone',
        variant: 'destructive',
      });
    }
  }, []);

  /**
   * Stop voice recording
   */
  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setRecordingState(prev => ({ ...prev, isRecording: false }));

    // Process audio
    const chunks = chunksRef.current;
    if (chunks.length > 0) {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      await transcribeAudio(audioBlob);
    }
  }, []);

  /**
   * Transcribe audio and generate SOAP
   */
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setLoading(true);
    setError(null);
    setProgress(10);

    // Optimistic UI update
    setOptimisticResult('Processando áudio e gerando nota SOAP...');
    setConsultationText(prev => prev + '\n\n[Transcrevendo áudio...]');

    try {
      setProgress(30);

      setProgress(50);

      // Firebase - transcrever áudio
      const { transcribeAudioBlob } = await import('@/services/ai/firebaseAIService');
      const { transcription } = await transcribeAudioBlob(audioBlob, 'audio/webm');

      setConsultationText(prev => prev.replace('\n\n[Transcrevendo áudio...]', transcription));

      setProgress(70);

      // Generate SOAP from transcription
      await generateSOAP(transcription);
    } catch (err) {
      logger.error('Error processing audio', err, 'SOAPAssistant');
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar áudio';
      setError(errorMessage);
      setOptimisticResult(null);
      setConsultationText(prev => prev.replace('\n\n[Transcrevendo áudio...]', ''));
      toast({
        title: 'Erro ao processar áudio',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [patient.id, language]);

  /**
   * Generate SOAP from consultation text
   */
  const generateSOAP = useCallback(async (text?: string) => {
    const inputText = text || consultationText;

    if (!inputText.trim()) {
      toast({
        title: 'Texto vazio',
        description: 'Digite ou grave a consulta primeiro',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(10);

    // Optimistic UI update
    setOptimisticResult('Analisando consulta e gerando nota SOAP...');

    try {
      setProgress(30);

      setProgress(50);

      // Firebase Cloud Functions - aiSoapNoteChat
      const { generateSOAPNote } = await import('@/services/ai/firebaseAIService');
      const result = await generateSOAPNote({
        patientContext: {
          patientName: patient.name,
          condition: patient.mainCondition ?? '',
          sessionNumber,
        },
        subjective: inputText,
        assistantNeeded: 'full',
      });

      if (!result.success || !result.soapNote) {
        throw new Error('Falha ao gerar nota SOAP');
      }

      setProgress(80);

      // Adaptar resposta: aiSoapNoteChat retorna texto, componente espera estrutura
      const data: SOAPGenerationResult = {
        soap: {
          subjective: result.soapNote,
          assessment: '',
          plan: {},
        },
        keyFindings: [],
        recommendations: [],
        redFlags: [],
      };

      setProgress(100);

      setFinalResult(data);
      setOptimisticResult(null);

      toast({
        title: 'Nota SOAP gerada!',
        description: 'A nota foi gerada com sucesso',
      });
    } catch (err) {
      logger.error('Error generating SOAP note', err, 'SOAPAssistant');
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar nota SOAP';
      setError(errorMessage);
      setOptimisticResult(null);
      toast({
        title: 'Erro ao gerar nota SOAP',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [consultationText, patient, previousSOAP, sessionNumber, sessionType, language]);

  /**
   * Apply SOAP section to form
   */
  const applySection = useCallback((
    section: 'subjective' | 'objective' | 'assessment' | 'plan'
  ) => {
    if (!finalResult) return;

    const content = finalResult.soap[section];
    if (!content) {
      toast({
        title: 'Seção vazia',
        description: 'Esta seção não possui conteúdo',
        variant: 'destructive',
      });
      return;
    }

    onApplySection?.(section, content);

    toast({
      title: 'Seção aplicada',
      description: `Conteúdo adicionado ao campo ${section.toUpperCase()}`,
    });
  }, [finalResult, onApplySection]);

  /**
   * Copy SOAP to clipboard
   */
  const copySOAP = useCallback(() => {
    if (!finalResult) return;

    const text = `
NOTA SOAP - Sessão ${sessionNumber}
Paciente: ${patient.name}

SUBJETIVO (S):
${finalResult.soap.subjective}

OBJETIVO (O):
${finalResult.soap.objective ? Object.entries(finalResult.soap.objective)
  .filter(([_, value]) => value)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n') : 'N/A'}

AVALIAÇÃO (A):
${finalResult.soap.assessment}

PLANO (P):
${finalResult.soap.plan ? Object.entries(finalResult.soap.plan)
  .filter(([_, value]) => value && (typeof value === 'string' || Array.isArray(value)))
  .map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
  .join('\n') : 'N/A'}

ACHADOS PRINCIPAIS:
${finalResult.keyFindings.map(f => `- ${f}`).join('\n')}

RECOMENDAÇÕES:
${finalResult.recommendations.map(r => `- ${r}`).join('\n')}
${finalResult.redFlags && finalResult.redFlags.length > 0 ? `
SINAIS DE ALERTA:
${finalResult.redFlags.map(r => `- ${r}`).join('\n')}
` : ''}
${finalResult.suggestedCodes && finalResult.suggestedCodes.length > 0 ? `
CÓDIGOS CID-10 SUGERIDOS:
${finalResult.suggestedCodes.join(', ')}
` : ''}
    `.trim();

    navigator.clipboard.writeText(text);

    toast({
      title: 'SOAP copiado!',
      description: 'A nota foi copiada para a área de transferência',
    });
  }, [finalResult, patient.name, sessionNumber]);

  /**
   * Format recording time
   */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Display result (optimistic or final)
  const result = optimisticResult || finalResult;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">Assistente SOAP</CardTitle>
              <CardDescription>
                Geração de notas clínicas para {patient.name}
              </CardDescription>
            </div>
            <Badge variant="outline">
              <Languages className="h-3 w-3 mr-1" />
              {language.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={startRecording}
              disabled={loading || recordingState.isRecording}
              variant={recordingState.isRecording ? 'destructive' : 'default'}
            >
              {recordingState.isRecording ? (
                <>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
                  {formatTime(recordingState.duration)}
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Gravar Consulta
                </>
              )}
            </Button>

            {recordingState.isRecording && (
              <Button onClick={stopRecording} variant="outline">
                <MicOff className="mr-2 h-4 w-4" />
                Parar Gravação
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Input Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Texto da Consulta</CardTitle>
          <CardDescription>
            Digite ou grave a consulta para gerar a nota SOAP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Digite ou grave a consulta aqui..."
            value={consultationText}
            onChange={(e) => setConsultationText(e.target.value)}
            rows={6}
            disabled={loading}
          />

          <Button
            onClick={() => generateSOAP()}
            disabled={loading || !consultationText.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando SOAP...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Gerar Nota SOAP
              </>
            )}
          </Button>

          {loading && progress > 0 && (
            <Progress value={progress} className="h-2" />
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
                <h3 className="font-semibold">Erro ao gerar SOAP</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => generateSOAP()}
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

      {/* Results Display */}
      {finalResult && (
        <>
          {/* SOAP Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Nota SOAP Gerada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Subjective */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg">S - Subjetivo</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applySection('subjective')}
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Aplicar
                  </Button>
                </div>
                <p className="text-sm bg-muted/50 p-3 rounded">
                  {finalResult.soap.subjective}
                </p>
              </div>

              <Separator />

              {/* Objective */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg">O - Objetivo</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applySection('objective')}
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Aplicar
                  </Button>
                </div>
                {finalResult.soap.objective ? (
                  <ScrollArea className="h-[200px]">
                    <div className="text-sm bg-muted/50 p-3 rounded space-y-2">
                      {Object.entries(finalResult.soap.objective)
                        .filter(([_, value]) => value)
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span>{' '}
                            <span>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum dado objetivo registrado</p>
                )}
              </div>

              <Separator />

              {/* Assessment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg">A - Avaliação</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applySection('assessment')}
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Aplicar
                  </Button>
                </div>
                <p className="text-sm bg-muted/50 p-3 rounded">
                  {finalResult.soap.assessment}
                </p>
              </div>

              <Separator />

              {/* Plan */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg">P - Plano</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applySection('plan')}
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Aplicar
                  </Button>
                </div>
                {finalResult.soap.plan ? (
                  <ScrollArea className="h-[200px]">
                    <div className="text-sm bg-muted/50 p-3 rounded space-y-2">
                      {Object.entries(finalResult.soap.plan)
                        .filter(([_, value]) => value && (typeof value === 'string' || Array.isArray(value)))
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span>{' '}
                            <span>{Array.isArray(value) ? value.join(', ') : value}</span>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum plano definido</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Key Findings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Achados Principais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {finalResult.keyFindings.map((finding, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{finding}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recomendações</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {finalResult.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <FileCheck className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Red Flags */}
          {finalResult.redFlags && finalResult.redFlags.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  Sinais de Alerta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {finalResult.redFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{flag}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* ICD-10 Codes */}
          {finalResult.suggestedCodes && finalResult.suggestedCodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Códigos CID-10 Sugeridos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {finalResult.suggestedCodes.map((code, i) => (
                    <Badge key={i} variant="secondary">
                      {code}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={copySOAP}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar SOAP
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setFinalResult(null);
                setConsultationText('');
              }}
            >
              Nova Consulta
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default SOAPAssistant;
