import { useCallback, useEffect, useRef, useState } from "react";
import { useVoiceAgent } from "@cloudflare/voice/react";
import { getWorkersApiUrl } from "@/lib/api/config";
import type { AudioCaptureMode, AudioCaptureReason } from "@fisioflow/core";

export interface UseVoiceScribeV2Options {
  organizationId: string;
  patientId: string;
  therapistId: string;
  captureMode?: AudioCaptureMode;
  captureReason?: AudioCaptureReason;
  /** Persiste a mesma instância DO entre reloads. Default: `${patientId}:observacao`. */
  sessionName?: string;
  /** Override do host. Default: `VITE_WORKERS_API_URL` (sem `https://`). */
  host?: string;
}

// getWorkersApiUrl tem fallback hardcoded — sem ele, build sem VITE_WORKERS_API_URL
// gera host vazio e o WS vira wss://agents/... (visto em prod 11/jul).
const DEFAULT_HOST = getWorkersApiUrl().replace(/^https?:\/\//, "").replace(/\/$/, "");

/**
 * Voice Scribe v2 — ditado contínuo com `VoiceScribeAgent` (Nova-3 pt-BR, sem TTS).
 *
 * O texto é ACUMULADO localmente (não recalculado do buffer da conexão):
 * reconexões do WS zeram `voice.transcript` e perdiam trechos já ditados.
 * `reset()` limpa o acumulado — chamar ao abrir uma nova sessão de ditado.
 */
export function useVoiceScribeV2(opts: UseVoiceScribeV2Options) {
  const sessionName = opts.sessionName ?? `${opts.patientId}:observacao`;

  const voice = useVoiceAgent({
    agent: "voice-scribe-agent",
    name: sessionName,
    host: opts.host ?? DEFAULT_HOST,
  });

  const [transcribedText, setTranscribedText] = useState("");
  const seenRef = useRef(0);

  useEffect(() => {
    const userMsgs = voice.transcript.filter((m) => m.role === "user");
    // Buffer da conexão encolheu = reconexão; recomeça a contagem sem perder o acumulado.
    if (userMsgs.length < seenRef.current) seenRef.current = 0;
    const fresh = userMsgs
      .slice(seenRef.current)
      .map((m) => m.text.trim())
      .filter(Boolean)
      .join(" ");
    seenRef.current = userMsgs.length;
    if (fresh) setTranscribedText((prev) => (prev ? `${prev} ${fresh}` : fresh));
  }, [voice.transcript]);

  useEffect(() => {
    if (!voice.connected) return;
    voice.sendJSON({
      type: "set-context",
      organizationId: opts.organizationId,
      patientId: opts.patientId,
      therapistId: opts.therapistId,
      captureMode: opts.captureMode ?? 30,
      captureReason: opts.captureReason ?? "soap_section",
    });
  }, [
    voice.connected,
    voice.sendJSON,
    opts.organizationId,
    opts.patientId,
    opts.therapistId,
    opts.captureMode,
    opts.captureReason,
  ]);

  const reset = useCallback(() => {
    seenRef.current = 0;
    setTranscribedText("");
  }, []);

  return {
    status: voice.status,
    connected: voice.connected,
    isMuted: voice.isMuted,
    error: voice.error,
    audioLevel: voice.audioLevel,
    interimTranscript: voice.interimTranscript,
    transcribedText,
    startRecording: voice.startCall,
    stopRecording: voice.endCall,
    toggleMute: voice.toggleMute,
    reset,
    flush: () => voice.sendJSON({ type: "flush" }),
  };
}
