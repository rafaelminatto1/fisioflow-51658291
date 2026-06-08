import { useCallback, useState } from "react";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder as useExpoAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

/**
 * Hook de gravação de áudio para comandos de voz.
 *
 * Encapsula o `useAudioRecorder` do expo-audio expondo a API mínima usada
 * pelas telas (`isRecording`, `startRecording`, `stopRecording`, `audioUri`).
 */
export function useAudioRecorder() {
  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return;

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    setAudioUri(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    await recorder.stop();
    setAudioUri(recorder.uri ?? null);
  }, [recorder]);

  return {
    isRecording: state.isRecording,
    startRecording,
    stopRecording,
    audioUri,
  };
}
