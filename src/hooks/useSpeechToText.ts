import { useState } from 'react';
import { API_URLS } from '@/lib/api/v2/config';
import { useToast } from '@/hooks/use-toast';
import { fisioLogger as logger } from '@/lib/errors/logger';

export const useSpeechToText = () => {
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();

  const transcribe = async (audioBlob: Blob): Promise<string> => {
    try {
      setIsRecording(true);
      
      // Converter Blob para base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String.split(',')[1]); // Remover o prefixo data:...base64,
        };
      });
      reader.readAsDataURL(audioBlob);
      const audioBase64 = await base64Promise;

      // Chamar API do Google Cloud via nossa Function
      const response = await fetch(API_URLS.clinical.transcribe, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await (await import('firebase/auth')).getAuth().currentUser?.getIdToken()}`
        },
        body: JSON.stringify({ audio: audioBase64 })
      });

      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || 'Falha na transcrição');

      return result.data.transcript || '';
    } catch (error) {
      logger.error('Speech-to-Text Error:', error);
      toast({
        title: 'Erro na transcrição',
        description: 'Não foi possível converter sua fala em texto.',
        variant: 'destructive'
      });
      return '';
    } finally {
      setIsRecording(false);
    }
  };

  return { transcribe, isRecording };
};
