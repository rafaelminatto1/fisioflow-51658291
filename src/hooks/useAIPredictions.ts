import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useAIPredictions() {
  const predictAdherence = useMutation({
    mutationFn: async (patientId: string) => {
      const { data, error } = await supabase.functions.invoke('ai-treatment-assistant', {
        body: { patientId, action: 'predict_adherence' }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: '🔮 Predição concluída',
        description: 'Análise de aderência gerada com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na predição',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const predictOutcome = useMutation({
    mutationFn: async (patientId: string) => {
      const { data, error } = await supabase.functions.invoke('ai-treatment-assistant', {
        body: { patientId, action: 'predict_outcome' }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: '📊 Previsão gerada',
        description: 'Resultado do tratamento previsto com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na previsão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    predictAdherence,
    predictOutcome,
  };
}
