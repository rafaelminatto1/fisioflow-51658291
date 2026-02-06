import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Mic, StopCircle } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

interface MagicTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onValueChange: (value: string) => void;
}

export function MagicTextarea({ value, onValueChange, className, ...props }: MagicTextareaProps) {
  const [loading, setLoading] = useState(false);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data url prefix (e.g., "data:audio/webm;base64,")
        const base64 = base64String.split(',')[1];
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
      try {
        const audioBlob = await stopRecording();
        const audioBase64 = await blobToBase64(audioBlob);

        const transcribe = httpsCallable(functions, 'transcribeAudio');
        const result = await transcribe({ audio: audioBase64 });
        
        const transcription = (result.data as unknown).transcription;
        if (transcription) {
          // Adiciona ao texto existente ou substitui
          const newValue = value ? `${value} ${transcription}` : transcription;
          onValueChange(newValue);
        }
      } catch (error) {
        console.error("Transcription Error:", error);
      } finally {
        setLoading(false);
      }
    } else {
      // Iniciar
      await startRecording();
    }
  };

  const handleMagicFix = async () => {
    if (!value || value.length < 5) return;
    
    setLoading(true);
    try {
      const fixText = httpsCallable(functions, 'aiFastProcessing');
      const result = await fixText({ text: value, mode: 'fix_grammar' });
      
      const correctedText = (result.data as unknown).result;
      if (correctedText) {
        onValueChange(correctedText);
      }
    } catch (error) {
      console.error("Groq AI Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative group">
      <Textarea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn("pr-20 transition-all focus:ring-purple-500/20", className)}
        {...props}
      />
      
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          {/* Botão de Microfone */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "h-8 w-8 rounded-full transition-colors",
                  isRecording 
                    ? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse" 
                    : "hover:bg-blue-100 text-blue-600"
                )}
                onClick={handleMicClick}
                disabled={loading && !isRecording}
              >
                {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isRecording ? 'Parar e Transcrever' : 'Ditar (Google Speech)'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Botão de Magia (Groq) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-purple-100 text-purple-600 rounded-full"
                onClick={handleMagicFix}
                disabled={loading || !value || isRecording}
              >
                {loading && !isRecording ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Melhorar texto com IA (Groq)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
