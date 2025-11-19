import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, Square, Play, Pause, Trash2, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AudioTranscriptionProps {
  patientId: string;
  onTranscriptionComplete: (soapData: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  }) => void;
}

export function AudioTranscription({ patientId, onTranscriptionComplete }: AudioTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: 'Gravação iniciada',
        description: 'Fale naturalmente sobre a sessão.',
      });
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível acessar o microfone.',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setTranscription('');
    setRecordingTime(0);
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        // Call edge function
        const { data, error } = await supabase.functions.invoke('ai-transcribe-session', {
          body: {
            audioData: base64Audio,
            patientId
          }
        });

        if (error) throw error;

        if (data?.soapData) {
          setTranscription(JSON.stringify(data.soapData, null, 2));
          onTranscriptionComplete(data.soapData);
          
          toast({
            title: 'Transcrição concluída',
            description: 'SOAP estruturado com sucesso!',
          });
        }
      };
    } catch (error) {
      console.error('Erro na transcrição:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível transcrever o áudio.',
        variant: 'destructive'
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          Gravação de Áudio para SOAP
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recording Controls */}
        <div className="flex flex-col items-center gap-4">
          {isRecording && (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
              <span className="text-lg font-mono font-bold">{formatTime(recordingTime)}</span>
              <Badge variant="destructive" className="animate-pulse">Gravando</Badge>
            </div>
          )}

          <div className="flex gap-3">
            {!isRecording && !audioBlob && (
              <Button onClick={startRecording} size="lg" className="gap-2">
                <Mic className="h-5 w-5" />
                Iniciar Gravação
              </Button>
            )}

            {isRecording && (
              <>
                <Button onClick={pauseRecording} variant="outline" size="lg" className="gap-2">
                  {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                  {isPaused ? 'Retomar' : 'Pausar'}
                </Button>
                <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
                  <Square className="h-5 w-5" />
                  Parar
                </Button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button onClick={deleteRecording} variant="outline" size="lg" className="gap-2">
                  <Trash2 className="h-5 w-5" />
                  Descartar
                </Button>
                <Button 
                  onClick={transcribeAudio} 
                  disabled={isTranscribing}
                  size="lg" 
                  className="gap-2"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Transcrevendo...
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      Transcrever
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Instructions */}
        {!audioBlob && !isRecording && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-sm text-muted-foreground">
              <strong>Dica:</strong> Grave sua narração da sessão e a IA estruturará automaticamente em formato SOAP.
              Fale naturalmente sobre:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Queixa e sintomas do paciente (Subjetivo)</li>
              <li>Avaliação física e testes (Objetivo)</li>
              <li>Análise e diagnóstico (Avaliação)</li>
              <li>Conduta e exercícios prescritos (Plano)</li>
            </ul>
          </div>
        )}

        {/* Transcription Result */}
        {transcription && (
          <div className="p-4 rounded-lg bg-success/10 border border-success/30">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-success" />
              <span className="font-medium text-success">SOAP Estruturado</span>
            </div>
            <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
              {transcription}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}