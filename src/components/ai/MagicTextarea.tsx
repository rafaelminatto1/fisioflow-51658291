import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Mic, StopCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { aiApi } from "@/api/v2";
import { BilingualSuggestionsModal } from "../evolution/suggestion/BilingualSuggestionsModal";
import { toast } from "sonner";

interface MagicTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onValueChange: (value: string) => void;
  showMic?: boolean;
}

export function MagicTextarea({
  value,
  onValueChange,
  showMic = true,
  className,
  ...props
}: MagicTextareaProps) {
  const [loading, setLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data url prefix (e.g., "data:audio/webm;base64,")
        const base64 = base64String.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleMicClick = async () => {
    if (isRecording) {
      // Parar e Transcrever
      setLoading(true);
      const toastId = toast.loading("Processando áudio...");
      try {
        const audioBlob = await stopRecording();
        
        // Verifica se o áudio tem tamanho mínimo
        if (audioBlob.size < 1000) {
          toast.error("Áudio muito curto. Tente falar um pouco mais.", { id: toastId });
          setLoading(false);
          return;
        }

        const audioBase64 = await blobToBase64(audioBlob);

        const result = await aiApi.transcribeAudio({
          audio: audioBase64,
          mimeType: audioBlob.type || "audio/webm",
        });
        
        const transcription = result.data.transcription;
        if (transcription && transcription.trim()) {
          // Adiciona ao texto existente ou substitui
          const newValue = value ? `${value} ${transcription}` : transcription;
          onValueChange(newValue);
          toast.success("Transcrição concluída!", { id: toastId });
        } else {
          toast.warning("Não foi possível detectar fala no áudio.", { id: toastId });
        }
      } catch (error) {
        console.error("Transcription Error:", error);
        toast.error("Erro ao transcrever áudio. Tente novamente.", { id: toastId });
      } finally {
        setLoading(false);
      }
    } else {
      // Iniciar
      try {
        await startRecording();
        toast.info("Gravando... Clique no botão vermelho para parar.", { duration: 3000 });
      } catch (error) {
        console.error("Mic Permission Error:", error);
        toast.error("Erro ao acessar microfone. Verifique as permissões do navegador.");
      }
    }
  };

  const handleMagicFix = async () => {
    if (!value || value.length < 5) {
      toast.warning("Escreva algo primeiro para refinar.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("IA refinando seu texto...");
    try {
      const result = await aiApi.fastProcessing({
        text: value,
        mode: "fix_grammar",
      });
      const correctedText = result.data.result;
      if (correctedText) {
        onValueChange(correctedText);
        toast.success("Texto refinado com sucesso!", { id: toastId });
      }
    } catch (error) {
      console.error("Groq AI Error:", error);
      toast.error("Erro ao processar texto com IA.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Detectar /sugestoes
    if (e.key === "Enter" || e.key === " ") {
      const lastWord = value.split(/[\s\n]+/).pop();
      if (lastWord === "/sugestoes") {
        e.preventDefault();
        // Remove o comando do texto
        const newValue = value.slice(0, -10).trim();
        onValueChange(newValue);
        setIsSearchOpen(true);
      }
    }
    // Também permite props.onKeyDown se existir
    props.onKeyDown?.(e);
  };

  const handleSearchSelect = (term: string) => {
    const newValue = value ? `${value}\n${term}` : term;
    onValueChange(newValue);
  };

  return (
    <div className="relative group">
      <Textarea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={cn(
          "pr-28 transition-all focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 min-h-[100px] resize-none scrollbar-hide",
          className,
        )}
        {...props}
      />

      <div className="absolute bottom-2 right-2 flex gap-1.5 p-1 rounded-full bg-white/60 backdrop-blur-md border border-slate-200/50 shadow-sm transition-all duration-300">
        <TooltipProvider>
          {/* Botão de Microfone */}
          {showMic && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-8 w-8 rounded-full transition-all duration-200",
                    isRecording
                      ? "bg-red-500 text-white hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/20"
                      : "hover:bg-blue-50 text-blue-600 hover:text-blue-700",
                  )}
                  onClick={handleMicClick}
                  disabled={loading}
                >
                  {loading && !isRecording ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isRecording ? (
                    <StopCircle className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isRecording ? "Parar e Transcrever" : "Ditar texto"}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Botão de Magia (Groq) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "h-8 w-8 rounded-full transition-all duration-200",
                  loading && !isRecording
                    ? "bg-teal-50 text-teal-600"
                    : "hover:bg-teal-50 text-teal-600 hover:text-teal-700 hover:shadow-lg hover:shadow-teal-500/10",
                )}
                onClick={handleMagicFix}
                disabled={loading || !value || isRecording}
              >
                {loading && !isRecording ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 fill-current opacity-70" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Refinar texto com IA</p>
            </TooltipContent>
          </Tooltip>

          {/* Botão de Dicionário Clínico (Bilingue) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-full transition-all duration-200"
                onClick={() => setIsSearchOpen(true)}
                disabled={isRecording}
              >
                <BookOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Dicionário Clínico (/sugestoes)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <BilingualSuggestionsModal
          open={isSearchOpen}
          onOpenChange={setIsSearchOpen}
          onSelect={handleSearchSelect}
        />
      </div>
    </div>
  );
}
