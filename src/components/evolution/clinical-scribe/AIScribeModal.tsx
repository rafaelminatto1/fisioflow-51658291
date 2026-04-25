import React, { useState, useEffect } from "react";
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
  Loader2,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Sparkles,
  FileText,
} from "lucide-react";
import { useVoiceScribe, type SoapFields } from "@/hooks/useVoiceScribe";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AIScribeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (soap: SoapFields) => void;
}

export const AIScribeModal: React.FC<AIScribeModalProps> = ({ open, onOpenChange, onApply }) => {
  const {
    voiceState,
    transcribedText,
    soapFields,
    error,
    isRecording,
    startRecording,
    stopAndTranscribe,
    reset,
  } = useVoiceScribe();

  const [recordingTime, setRecordingTime] = useState(0);
  const [writingStyle, setWritingStyle] = useState("formal");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStop = async () => {
    const result = await stopAndTranscribe();
    if (result) {
      toast.success("Evolução gerada com sucesso!");
    }
  };

  const handleApply = () => {
    if (soapFields) {
      onApply(soapFields);
      onOpenChange(false);
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-premium-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

        <DialogHeader className="p-8 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-2xl font-black tracking-tight uppercase italic">
                AI Scribe
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Escuta Ambiente Clínica
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 pt-6 space-y-8">
          {/* Writing Style Selector */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {["formal", "resumido", "topicos"].map((style) => (
              <button
                key={style}
                onClick={() => setWritingStyle(style)}
                className={cn(
                  "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                  writingStyle === style
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {style}
              </button>
            ))}
          </div>

          {/* Status & Visualizer */}
          <div className="flex flex-col items-center justify-center py-10 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
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

            <div className="mt-6 text-center z-10">
              {voiceState === "idle" && (
                <p className="text-sm font-bold text-slate-500">Pronto para iniciar a sessão</p>
              )}
              {voiceState === "recording" && (
                <div className="space-y-1">
                  <p className="text-3xl font-black tracking-tighter text-slate-800 dark:text-slate-100 tabular-nums">
                    {formatTime(recordingTime)}
                  </p>
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    Gravando Ambiente...
                  </p>
                </div>
              )}
              {voiceState === "transcribing" && (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">
                    Processando Inteligência...
                  </p>
                </div>
              )}
              {voiceState === "done" && (
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">
                    Evolução Gerada!
                  </p>
                </div>
              )}
              {voiceState === "error" && (
                <div className="flex flex-col items-center gap-1 px-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                  <p className="text-xs font-bold text-red-600 uppercase tracking-widest">
                    {error || "Erro na captura"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Result Preview (Optional) */}
          {soapFields && (
            <div className="max-h-48 overflow-y-auto p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Preview SOAP
                </span>
              </div>
              <div className="space-y-3">
                {Object.entries(soapFields).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-[9px] font-black uppercase text-blue-600/60">{key}</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pb-4">
            {voiceState === "idle" && (
              <Button
                onClick={startRecording}
                className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20"
              >
                <Mic className="w-4 h-4 mr-2" /> Iniciar Escuta
              </Button>
            )}

            {voiceState === "recording" && (
              <Button
                onClick={handleStop}
                variant="destructive"
                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-600/20"
              >
                <Square className="w-4 h-4 mr-2" /> Parar e Processar
              </Button>
            )}

            {(voiceState === "done" || voiceState === "error") && (
              <Button
                variant="outline"
                onClick={reset}
                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs border-slate-200 dark:border-slate-800"
              >
                Tentar Novamente
              </Button>
            )}

            {voiceState === "done" && (
              <Button
                onClick={handleApply}
                className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Aplicar na Evolução
              </Button>
            )}
          </div>
        </div>

        <div className="px-8 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Whisper v3-large • Gemini 1.5 Flash
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
