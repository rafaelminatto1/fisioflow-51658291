import { useEffect, useMemo } from "react";
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
 * S6.3 Voice Scribe v2 — WebSocket contínuo com `VoiceScribeAgent` (Cloudflare Voice).
 * STT em tempo real via `WorkersAIFluxSTT`, sem TTS (uni-direcional).
 * Histórico persiste no DO entre reloads quando `sessionName` é estável.
 */
export function useVoiceScribeV2(opts: UseVoiceScribeV2Options) {
  const sessionName = opts.sessionName ?? `${opts.patientId}:observacao`;

  const voice = useVoiceAgent({
    agent: "voice-scribe-agent",
    name: sessionName,
    host: opts.host ?? DEFAULT_HOST,
  });

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

  const transcribedText = useMemo(
    () =>
      voice.transcript
        .filter((m) => m.role === "user")
        .map((m) => m.text)
        .join(" "),
    [voice.transcript],
  );

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
    flush: () => voice.sendJSON({ type: "flush" }),
  };
}
