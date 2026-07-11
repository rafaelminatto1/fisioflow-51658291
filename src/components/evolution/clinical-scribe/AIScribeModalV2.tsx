import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Square,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Sparkles,
  FileText,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useVoiceScribeV2 } from "@/hooks/useVoiceScribeV2";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AIScribeModalV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (text: string) => void;
  patientId?: string;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * S6.3 — Voice Scribe v2 (Cloudflare Voice Agents).
 * STT contínuo via WebSocket; transcrição em tempo real (interim + final).
 * Mantém contrato `onApply(SoapFields)` para retrocompat — texto livre vai em `subjective`.
 */
export const AIScribeModalV2: React.FC<AIScribeModalV2Props> = ({
  open,
  onOpenChange,
  onApply,
  patientId,
}) => {
  const auth = useAuth();
  const organizationId = auth.organizationId ?? auth.organization_id ?? "";
  const therapistId = auth.user?.uid ?? "";
  const ready = Boolean(open && organizationId && therapistId && patientId);

  const voice = useVoiceScribeV2({
    organizationId,
    patientId: patientId ?? "",
    therapistId,
  });

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (voice.status !== "listening") {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [voice.status]);

  useEffect(() => {
    if (!open && voice.status !== "idle") voice.stopRecording();
  }, [open, voice]);

  // Nova sessão de ditado começa limpa (sem texto da gravação anterior).
  useEffect(() => {
    if (open) voice.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isRecording = voice.status === "listening" || voice.status === "thinking";

  const handleStart = async () => {
    if (!ready) {
      toast.error("Faltam dados de paciente/usuário para iniciar.");
      return;
    }
    try {
      await voice.startRecording();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao iniciar microfone");
    }
  };

  const handleStop = async () => {
    voice.stopRecording();
    voice.flush();
    const text = voice.transcribedText.trim();
    if (!text) {
      toast.warning("Nenhum áudio transcrito.");
      return;
    }
    toast.success("Transcrição finalizada.");
  };

  const handleApply = () => {
    const text = voice.transcribedText.trim();
    if (!text) {
      toast.warning("Nada para aplicar.");
      return;
    }
    onApply(text);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl">
        <DialogHeader className="p-8 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-left flex-1">
              <DialogTitle className="text-2xl font-black tracking-tight uppercase italic">
                AI Scribe v2
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Streaming Cloudflare Voice
              </DialogDescription>
            </div>
            <div
              className={cn(
                "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                voice.connected
                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                  : "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
              )}
            >
              {voice.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {voice.connected ? "online" : "conectando"}
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 pt-6 space-y-6">
          <div className="flex flex-col items-center justify-center py-10 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            {isRecording && (
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <div className="w-32 h-32 bg-blue-500 rounded-full animate-ping" />
              </div>
            )}
            <div
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 relative z-10",
                isRecording
                  ? "bg-red-500 shadow-xl shadow-red-500/30 scale-110"
                  : "bg-slate-200 dark:bg-slate-800",
              )}
            >
              {isRecording ? (
                <Volume2 className="w-10 h-10 text-white animate-pulse" />
              ) : (
                <Mic className="w-10 h-10 text-slate-400" />
              )}
            </div>

            <div className="mt-6 text-center z-10 min-h-[60px]">
              {voice.status === "idle" && !voice.transcribedText && (
                <p className="text-sm font-bold text-slate-500">Pronto para iniciar a sessão</p>
              )}
              {voice.status === "listening" && (
                <div className="space-y-1">
                  <p className="text-3xl font-black tracking-tighter text-slate-800 dark:text-slate-100 tabular-nums">
                    {formatTime(elapsed)}
                  </p>
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    Capturando voz
                  </p>
                </div>
              )}
              {voice.status === "thinking" && (
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                  Processando transcrição…
                </p>
              )}
              {voice.error && (
                <div className="flex flex-col items-center gap-1 px-4">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <p className="text-xs font-bold text-red-600 uppercase tracking-widest">
                    {voice.error}
                  </p>
                </div>
              )}
            </div>
          </div>

          {(voice.transcribedText || voice.interimTranscript) && (
            <div className="max-h-48 overflow-y-auto p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Transcrição
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {voice.transcribedText}
                {voice.interimTranscript && (
                  <span className="text-slate-400 italic"> {voice.interimTranscript}</span>
                )}
              </p>
            </div>
          )}

          <div className="flex gap-3 pb-4">
            {!isRecording && !voice.transcribedText && (
              <Button
                onClick={handleStart}
                disabled={!ready || !voice.connected}
                className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20"
              >
                <Mic className="w-4 h-4 mr-2" /> Iniciar Escuta
              </Button>
            )}
            {isRecording && (
              <Button
                onClick={handleStop}
                variant="destructive"
                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-600/20"
              >
                <Square className="w-4 h-4 mr-2" /> Parar
              </Button>
            )}
            {!isRecording && voice.transcribedText && (
              <Button
                onClick={handleApply}
                className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Aplicar
              </Button>
            )}
          </div>
        </div>

        <div className="px-8 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Cloudflare Voice · Deepgram Nova-3 pt-BR
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
