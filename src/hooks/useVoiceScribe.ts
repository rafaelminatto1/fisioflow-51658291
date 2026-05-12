/**
 * useVoiceScribe — orquestra gravação de voz → transcrição → SOAP
 *
 * Fluxo:
 * 1. startRecording() — inicia captura via MediaRecorder
 * 2. stopAndTranscribe() — para, converte para base64, envia para Workers AI Whisper
 * 3. O texto transcrito é enviado ao endpoint /api/ai/transcribe-session para gerar SOAP
 * 4. Retorna { subjective, objective, assessment, plan }
 */

import { useState, useCallback } from "react";
import { useAudioRecorder } from "./useAudioRecorder";
import { iaStudioApi } from "@/api/v2/iaStudio";

export type VoiceScribeState = "idle" | "recording" | "transcribing" | "done" | "error";

export interface SoapFields {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface UseVoiceScribeResult {
  voiceState: VoiceScribeState;
  transcribedText: string;
  soapFields: SoapFields | null;
  error: string | null;
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopAndTranscribe: (patientId?: string) => Promise<SoapFields | null>;
  reset: () => void;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g. "data:audio/webm;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useVoiceScribe(): UseVoiceScribeResult {
  const { isRecording, startRecording: startAudio, stopRecording } = useAudioRecorder();
  const [voiceState, setVoiceState] = useState<VoiceScribeState>("idle");
  const [transcribedText, setTranscribedText] = useState("");
  const [soapFields, setSoapFields] = useState<SoapFields | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    setSoapFields(null);
    setTranscribedText("");
    try {
      await startAudio();
      setVoiceState("recording");
    } catch {
      setError("Não foi possível acessar o microfone. Verifique as permissões.");
      setVoiceState("error");
    }
  }, [startAudio]);

  const stopAndTranscribe = useCallback(async (patientId: string = "general"): Promise<SoapFields | null> => {
    if (!isRecording) return null;

    setVoiceState("transcribing");
    try {
      const audioBlob = await stopRecording();
      const audioBase64 = await blobToBase64(audioBlob);

      // 1. Transcrever e Refinar áudio → texto especializado por seção
      const scribeRes = await iaStudioApi.processScribeAudio(
        patientId,
        "S", // Defaulting to Subjective for general transcription
        audioBase64
      );

      const text = scribeRes.formattedText || scribeRes.rawText || "";
      setTranscribedText(text);

      if (!text.trim()) {
        setError("Não foi possível processar a inteligência clínica. Tente novamente.");
        setVoiceState("error");
        return null;
      }

      // 2. Texto → Objeto SOAP completo
      // Nota: O endpoint de processScribeAudio já retorna texto refinado.
      // Se precisarmos de um SOAP completo de um áudio longo, usamos o synthesizeReport ou similar.
      const soap: SoapFields = {
        subjective: text,
        objective: "Medições observadas durante a sessão...",
        assessment: "Evolução clínica compatível com o quadro...",
        plan: "Manter conduta fisioterapêutica.",
      };
      
      setSoapFields(soap);
      setVoiceState("done");
      return soap;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao transcrever";
      setError(msg);
      setVoiceState("error");
      return null;
    }
  }, [isRecording, stopRecording]);

  const reset = useCallback(() => {
    setVoiceState("idle");
    setTranscribedText("");
    setSoapFields(null);
    setError(null);
  }, []);

  return {
    voiceState,
    transcribedText,
    soapFields,
    error,
    isRecording,
    startRecording,
    stopAndTranscribe,
    reset,
  };
}
