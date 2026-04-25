import { useEffect, useRef, useState } from "react";
import { Mic, Square, Sparkles, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/v2/client";
import { getWorkersApiUrl } from "@/lib/api/config";

type Mode = "recording" | "on-device" | "premium";
type Status =
  | "idle"
  | "recording"
  | "transcribing"
  | "analyzing"
  | "completed"
  | "error"
  | "live-connecting"
  | "live-active";

export interface AssessmentVoiceRecorderProps {
  patientId?: string;
  patientContextHint?: string;
  onCompleted?: (result: {
    form: unknown;
    transcript: string;
    patientContextUsed: boolean;
  }) => void;
}

const MODE_LABELS: Record<Mode, string> = {
  recording: "Gravar e transcrever",
  "on-device": "Ditado no navegador",
  premium: "Premium (tempo real)",
};

const MODE_HINTS: Record<Mode, string> = {
  recording:
    "Grava o áudio no dispositivo, transcreve com Whisper Turbo (Workers AI) e gera o formulário estruturado.",
  "on-device":
    "Reconhecimento de fala nativo do navegador (gratuito, melhor em Chrome/Edge). Sem upload de áudio.",
  premium:
    "Gemini Live API — raciocínio em tempo real, preenchimento progressivo. Custo estimado: R$1–2/avaliação.",
};

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function AssessmentVoiceRecorder({
  patientId,
  patientContextHint,
  onCompleted,
}: AssessmentVoiceRecorderProps) {
  const [mode, setMode] = useState<Mode>("recording");
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [formResult, setFormResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<string[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      try {
        mediaRecorderRef.current?.stop();
      } catch {}
      try {
        recognitionRef.current?.stop();
      } catch {}
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, []);

  const resetState = () => {
    setStatus("idle");
    setTranscript("");
    setFormResult(null);
    setError(null);
    setLiveMessages([]);
  };

  const analyzeTranscript = async (text: string) => {
    setStatus("analyzing");
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: unknown;
        transcript: string;
        patientContextUsed: boolean;
      }>(`${getWorkersApiUrl()}/api/ai/assessment/transcript`, {
        transcript: text,
        patientId,
        patientContextHint,
      });
      setFormResult(res.data);
      setStatus("completed");
      onCompleted?.({
        form: res.data,
        transcript: res.transcript,
        patientContextUsed: res.patientContextUsed,
      });
    } catch (e: any) {
      setError(e?.message ?? "Erro ao analisar transcrição");
      setStatus("error");
    }
  };

  const startRecording = async () => {
    resetState();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setStatus("transcribing");
        try {
          const audioBase64 = await blobToBase64(blob);
          const res = await apiClient.post<{
            success: boolean;
            data: unknown;
            transcript: string;
            patientContextUsed: boolean;
          }>(`${getWorkersApiUrl()}/api/ai/assessment/recording`, {
            audioBase64,
            patientId,
            patientContextHint,
          });
          setTranscript(res.transcript);
          setFormResult(res.data);
          setStatus("completed");
          onCompleted?.({
            form: res.data,
            transcript: res.transcript,
            patientContextUsed: res.patientContextUsed,
          });
        } catch (e: any) {
          setError(e?.message ?? "Erro ao processar gravação");
          setStatus("error");
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setStatus("recording");
    } catch (e: any) {
      setError(e?.message ?? "Permissão de microfone negada");
      setStatus("error");
    }
  };

  const stopRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch {}
  };

  const startOnDevice = () => {
    resetState();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError(
        "Web Speech API não suportada neste navegador. Use Chrome, Edge ou o modo Gravação.",
      );
      setStatus("error");
      return;
    }
    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    let full = "";
    recognition.onresult = (evt: any) => {
      let interim = "";
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        const t = evt.results[i][0].transcript;
        if (evt.results[i].isFinal) full += t + " ";
        else interim += t;
      }
      setTranscript(full + interim);
    };
    recognition.onerror = (e: any) => {
      setError(`Erro no reconhecimento: ${e?.error ?? "desconhecido"}`);
      setStatus("error");
    };
    recognition.onend = () => {
      if (full.trim().length > 10) {
        analyzeTranscript(full.trim());
      } else {
        setStatus("idle");
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
    setStatus("recording");
  };

  const stopOnDevice = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
  };

  const startPremiumLive = () => {
    if (!patientId) {
      setError("Selecione um paciente antes de iniciar o modo Premium.");
      setStatus("error");
      return;
    }
    resetState();
    setStatus("live-connecting");
    try {
      const base = getWorkersApiUrl().replace(/^http/, "ws");
      const url = `${base}/api/ai/assessment/live-ws?patientId=${encodeURIComponent(patientId)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => setStatus("live-active");
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "text") {
            setLiveMessages((m) => [...m, msg.text]);
          } else if (msg.type === "error") {
            setError(msg.message ?? "Erro na sessão Live");
            setStatus("error");
          } else if (msg.type === "close") {
            setStatus("idle");
          }
        } catch {}
      };
      ws.onerror = () => {
        setError("Falha na conexão Live. Verifique se o Premium está habilitado.");
        setStatus("error");
      };
      ws.onclose = () => {
        if (status === "live-active" || status === "live-connecting") {
          setStatus("idle");
        }
      };
    } catch (e: any) {
      setError(e?.message ?? "Erro ao abrir WebSocket");
      setStatus("error");
    }
  };

  const stopPremiumLive = () => {
    try {
      wsRef.current?.send(JSON.stringify({ type: "close" }));
      wsRef.current?.close();
    } catch {}
    setStatus("idle");
  };

  const isBusy =
    status === "recording" ||
    status === "transcribing" ||
    status === "analyzing" ||
    status === "live-connecting" ||
    status === "live-active";

  const primaryAction = () => {
    if (mode === "recording") {
      return status === "recording" ? stopRecording : startRecording;
    }
    if (mode === "on-device") {
      return status === "recording" ? stopOnDevice : startOnDevice;
    }
    return status === "live-active" || status === "live-connecting"
      ? stopPremiumLive
      : startPremiumLive;
  };

  const primaryLabel = () => {
    if (status === "recording" || status === "live-active") return "Parar";
    if (status === "live-connecting") return "Conectando...";
    if (status === "transcribing") return "Transcrevendo...";
    if (status === "analyzing") return "Analisando...";
    if (mode === "premium") return "Iniciar Premium";
    return "Iniciar";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Avaliação por voz com IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Modo de captura</Label>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as Mode)}
            disabled={isBusy}
            className="mt-2 justify-start"
          >
            <ToggleGroupItem value="recording">Gravação</ToggleGroupItem>
            <ToggleGroupItem value="on-device">On-device</ToggleGroupItem>
            <ToggleGroupItem value="premium">
              <Sparkles className="mr-1 h-4 w-4" />
              Premium
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="mt-2 text-xs text-muted-foreground">{MODE_HINTS[mode]}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={primaryAction()}
            disabled={isBusy && status !== "recording" && status !== "live-active"}
          >
            {status === "recording" || status === "live-active" ? (
              <Square className="mr-2 h-4 w-4" />
            ) : isBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mic className="mr-2 h-4 w-4" />
            )}
            {primaryLabel()}
          </Button>
          <Badge variant="outline">{MODE_LABELS[mode]}</Badge>
          {status !== "idle" && <Badge variant="secondary">{status}</Badge>}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {(transcript || liveMessages.length > 0) && (
          <div>
            <Label className="text-sm font-medium">
              {mode === "premium" ? "Sessão Live" : "Transcrição"}
            </Label>
            <Textarea
              value={mode === "premium" ? liveMessages.join("\n") : transcript}
              readOnly
              rows={6}
              className="mt-2 font-mono text-xs"
            />
          </div>
        )}

        {!!formResult && (
          <div>
            <Label className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              Formulário estruturado
            </Label>
            <pre className="mt-2 max-h-96 overflow-auto rounded bg-muted p-3 text-xs">
              {JSON.stringify(formResult, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AssessmentVoiceRecorder;
