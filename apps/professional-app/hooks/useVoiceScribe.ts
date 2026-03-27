/**
 * useVoiceScribe — gravação de voz + transcrição para evolução (Mobile)
 * Usa expo-audio (SDK 55) para gravar, depois envia para /api/ai/transcribe-audio
 */
import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { fetchApi } from '@/lib/api';

export type VoiceScribeState = 'idle' | 'recording' | 'transcribing' | 'done' | 'error';

export function useVoiceScribe(onTranscribed: (text: string) => void) {
  const [state, setState] = useState<VoiceScribeState>('idle');
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const startedRef = useRef(false);

  const startRecording = async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso ao microfone nas Configurações do dispositivo.');
        return;
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      startedRef.current = true;
      setState('recording');
    } catch (err: any) {
      setState('error');
      Alert.alert('Erro', 'Não foi possível iniciar a gravação: ' + (err?.message ?? ''));
    }
  };

  const stopAndTranscribe = async () => {
    if (!startedRef.current) return;
    setState('transcribing');
    try {
      await audioRecorder.stop();
      startedRef.current = false;
      const uri = audioRecorder.uri;
      if (!uri) throw new Error('Arquivo de áudio não encontrado');

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const result = await fetchApi<{ text?: string; transcription?: string }>(
        '/api/ai/transcribe-audio',
        {
          method: 'POST',
          data: { audio: base64, mimeType: 'audio/m4a' },
        }
      );

      const transcribed = result.text ?? result.transcription ?? '';
      if (transcribed) {
        onTranscribed(transcribed);
        setState('done');
      } else {
        throw new Error('Transcrição vazia');
      }
    } catch (err: any) {
      setState('error');
      Alert.alert('Erro na transcrição', err?.message ?? 'Não foi possível transcrever o áudio.');
    } finally {
      // Clean up temp file silently
      if (audioRecorder.uri) {
        FileSystem.deleteAsync(audioRecorder.uri, { idempotent: true }).catch(() => {});
      }
    }
  };

  const toggle = async () => {
    if (state === 'idle' || state === 'done' || state === 'error') {
      await startRecording();
    } else if (state === 'recording') {
      await stopAndTranscribe();
    }
  };

  const reset = () => setState('idle');

  return { state, toggle, reset };
}
