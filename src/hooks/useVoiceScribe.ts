/**
 * useVoiceScribe (v1) — gravação de voz → transcrição → texto livre da observação.
 *
 * @deprecated S6.3 — use `useVoiceScribeV2` (`@cloudflare/voice` + DO streaming).
 * Mantido enquanto `VITE_VOICE_SCRIBE_V2` não estiver totalmente cutovered.
 *
 * Fluxo:
 * 1. startRecording() — inicia captura via MediaRecorder
 * 2. stopAndTranscribe() — para, envia para Workers AI Whisper
 * 3. Retorna { observacao: string } pronto para concatenar à observação clínica
 */

import { useState, useCallback } from "react";
import { useAudioRecorder } from "./useAudioRecorder";
import { iaStudioApi } from "@/api/v2/iaStudio";

export type VoiceScribeState = "idle" | "recording" | "transcribing" | "done" | "error";

export interface VoiceTranscriptionResult {
  observacao: string;
}

/** @deprecated mantido para consumidores legados — usar `VoiceTranscriptionResult`. */
export interface SoapFields {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface UseVoiceScribeResult {
  voiceState: VoiceScribeState;
  transcribedText: string;
  result: VoiceTranscriptionResult | null;
  /** @deprecated use `result`. */
  soapFields: SoapFields | null;
  error: string | null;
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopAndTranscribe: (patientId?: string) => Promise<VoiceTranscriptionResult | null>;
  reset: () => void;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
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
  const [result, setResult] = useState<VoiceTranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    setResult(null);
    setTranscribedText("");
    try {
      await startAudio();
      setVoiceState("recording");
    } catch {
      setError("Não foi possível acessar o microfone. Verifique as permissões.");
      setVoiceState("error");
    }
  }, [startAudio]);

  const stopAndTranscribe = useCallback(
    async (patientId: string = "general"): Promise<VoiceTranscriptionResult | null> => {
      if (!isRecording) return null;

      setVoiceState("transcribing");
      try {
        const audioBlob = await stopRecording();
        const audioBase64 = await blobToBase64(audioBlob);

        const scribeRes = await iaStudioApi.processScribeAudio(patientId, "S", audioBase64);
        const text = (scribeRes.formattedText || scribeRes.rawText || "").trim();

        setTranscribedText(text);

        if (!text) {
          setError("Não foi possível processar o áudio. Tente novamente.");
          setVoiceState("error");
          return null;
        }

        const out: VoiceTranscriptionResult = { observacao: text };
        setResult(out);
        setVoiceState("done");
        return out;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao transcrever";
        setError(msg);
        setVoiceState("error");
        return null;
      }
    },
    [isRecording, stopRecording],
  );

  const reset = useCallback(() => {
    setVoiceState("idle");
    setTranscribedText("");
    setResult(null);
    setError(null);
  }, []);

  // Back-compat: monta um pseudo-SOAP onde tudo cai em `subjective`.
  const soapFields: SoapFields | null = result
    ? { subjective: result.observacao, objective: "", assessment: "", plan: "" }
    : null;

  return {
    voiceState,
    transcribedText,
    result,
    soapFields,
    error,
    isRecording,
    startRecording,
    stopAndTranscribe,
    reset,
  };
}
