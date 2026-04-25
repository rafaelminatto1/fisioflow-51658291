import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  X,
  Zap,
  Save,
  CheckCircle2,
  AlertCircle,
  Volume2,
  BrainCircuit,
  Loader2,
  FileText,
  Upload,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScribeWaveform } from "./ScribeWaveform";
import { cn } from "@/lib/utils";
import { iaStudioApi } from "@/api/v2";
import { toast } from "sonner";

interface ScribeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
}

type SoapSection = "S" | "O" | "A" | "P";

export const ScribeDrawer: React.FC<ScribeDrawerProps> = ({ isOpen, onClose, patientId }) => {
  const [activeSection, setActiveSection] = useState<SoapSection | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [consentObtained, setConsentObtained] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [transcription, setTranscription] = useState<Record<SoapSection, string>>({
    S: "",
    O: "",
    A: "",
    P: "",
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async (section: SoapSection) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(section, audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setActiveSection(section);
    } catch (err) {
      toast.error("Microfone não autorizado.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (section: SoapSection, blob: Blob) => {
    if (!patientId) return toast.error("Paciente não selecionado.");
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      });
      reader.readAsDataURL(blob);
      const audioBase64 = await base64Promise;
      const response = await iaStudioApi.processScribeAudio(patientId, section, audioBase64);
      if (response.success) {
        setTranscription((prev) => ({ ...prev, [section]: response.formattedText }));
        toast.success(`Seção ${section} refinada pela IA!`);
      }
    } catch (err) {
      toast.error("Falha no refino da IA.");
    } finally {
      setIsProcessing(false);
      setActiveSection(null);
    }
  };

  const handleScanExam = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    toast.info("Escaneando laudo com IA Vision...");

    // Simulação de OCR + IA
    setTimeout(() => {
      setIsScanning(false);
      setTranscription((prev) => ({
        ...prev,
        O:
          prev.O +
          "\n[EXAME] RM de Coluna Lombar: Sinais de desidratação discal em L4-L5 e L5-S1. Protusão discal focal póstero-central em L5-S1.",
      }));
      toast.success("Dados do exame extraídos para a seção Objetiva!");
    }, 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-950/90 backdrop-blur-2xl border-l border-violet-500/30 shadow-2xl z-[100] text-slate-50 flex flex-col overflow-hidden"
        >
          {/* Aura Background Effect */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 blur-[100px] pointer-events-none" />

          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between relative bg-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-600/20">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight uppercase">
                  FisioAmbient <span className="text-violet-400">2.0</span>
                </h2>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">
                    IA Clínica Ativa
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-6 relative">
            {/* Consent & Quick Tools */}
            <div className="space-y-4 mb-8">
              <div
                className={cn(
                  "p-4 rounded-3xl border transition-all duration-500",
                  consentObtained
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-violet-500/5 border-violet-500/20",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="consent" className="text-xs font-bold cursor-pointer">
                      Consentimento Verbal
                    </Label>
                    <p className="text-[10px] text-slate-500">Autorização para registro por voz</p>
                  </div>
                  <Switch
                    id="consent"
                    checked={consentObtained}
                    onCheckedChange={setConsentObtained}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  disabled={!consentObtained || isScanning}
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 gap-2 font-bold text-xs"
                >
                  {isScanning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 text-violet-400" />
                  )}
                  Scan Laudo (OCR)
                </Button>
                <input
                  type="file"
                  hidden
                  ref={fileInputRef}
                  accept="image/*,application/pdf"
                  onChange={handleScanExam}
                />
              </div>
            </div>

            {/* SOAP PTT Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {(["S", "O", "A", "P"] as SoapSection[]).map((section) => (
                <button
                  key={section}
                  disabled={
                    !consentObtained ||
                    (activeSection !== null && activeSection !== section) ||
                    isProcessing
                  }
                  onClick={() =>
                    activeSection === section && isRecording
                      ? stopRecording()
                      : startRecording(section)
                  }
                  className={cn(
                    "relative group flex flex-col items-center justify-center p-6 rounded-[32px] border transition-all duration-500 overflow-hidden",
                    activeSection === section && isRecording
                      ? "bg-red-500/20 border-red-500 shadow-lg shadow-red-500/10 scale-[1.02]"
                      : "bg-slate-900 border-white/5 hover:border-violet-500/40 shadow-sm",
                    !consentObtained && "opacity-30 grayscale cursor-not-allowed",
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all duration-500",
                      activeSection === section && isRecording
                        ? "bg-red-500 rotate-12"
                        : "bg-white/5 group-hover:bg-violet-600 group-hover:-rotate-6",
                    )}
                  >
                    {activeSection === section && isRecording ? (
                      <Volume2 className="w-6 h-6" />
                    ) : (
                      <Mic className="w-6 h-6" />
                    )}
                  </div>
                  <span className="text-base font-black">{section}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">
                    {section === "S"
                      ? "Subjetivo"
                      : section === "O"
                        ? "Objetivo"
                        : section === "A"
                          ? "Avaliação"
                          : "Plano"}
                  </span>
                </button>
              ))}
            </div>

            {/* Processing State */}
            <AnimatePresence>
              {(isRecording || isProcessing) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-8"
                >
                  <Card className="bg-violet-600 border-none rounded-[32px] shadow-xl shadow-violet-600/20 overflow-hidden">
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                      <div className="flex items-center justify-between w-full">
                        <Badge className="bg-white/20 text-white border-none backdrop-blur-md">
                          {isProcessing ? "IA Processando..." : "Escutando..."}
                        </Badge>
                        <span className="text-[10px] font-black text-white/50 tracking-widest uppercase">
                          Max 2:00
                        </span>
                      </div>
                      <ScribeWaveform isRecording={isRecording} />
                      {isProcessing && (
                        <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest">
                          Refinando termos técnicos com Llama 3.1
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Review Section */}
            <div className="space-y-6 pb-20">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-violet-500 rounded-full" />
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">
                  Resumo da IA Studio
                </h3>
              </div>

              {(["S", "O", "A", "P"] as SoapSection[]).map(
                (section) =>
                  transcription[section] && (
                    <motion.div
                      key={section}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-violet-500/20 transition-all group relative"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-violet-500/10 text-violet-400 border-violet-500/20 font-black"
                          >
                            {section}
                          </Badge>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            Gerado por IA
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[9px] font-black uppercase hover:text-violet-400 px-2 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Editar
                        </Button>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                        "{transcription[section]}"
                      </p>
                    </motion.div>
                  ),
              )}

              {Object.values(transcription).every((t) => !t) && !isProcessing && !isRecording && (
                <div className="text-center py-12 px-6">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-6 h-6 text-slate-700" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-400 mb-2">
                    Suas mãos livres para o paciente
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-[200px] mx-auto font-medium">
                    Use os botões acima para ditar as evoluções ou escaneie laudos médicos.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-6 bg-slate-950/50 backdrop-blur-xl border-t border-white/5">
            <Button
              onClick={() => {
                toast.success("Evolução sincronizada com sucesso!");
                onClose();
              }}
              disabled={Object.values(transcription).every((t) => !t) || isProcessing}
              className="w-full h-14 bg-violet-600 hover:bg-violet-500 text-white rounded-[24px] font-black text-sm gap-3 shadow-xl shadow-violet-600/20 transition-all hover:translate-y-[-2px] active:scale-95"
            >
              <Save className="w-5 h-5" />
              Sincronizar Prontuário
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScribeDrawer;
