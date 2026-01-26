/**
 * useAIPredictions - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - Firebase Functions for AI predictions
 * - Auth through useAuth() from AuthContext
 */

import { useMutation } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { toast } from '@/hooks/use-toast';
import { getFirebaseApp } from '@/integrations/firebase/app';

const functions = getFunctions(getFirebaseApp());

export function useAIPredictions() {
  const predictAdherence = useMutation({
    mutationFn: async (patientId: string) => {
      const predictAdherenceFn = httpsCallable(functions, 'ai-treatment-assistant');
      const result = await predictAdherenceFn({
        patientId,
        action: 'predict_adherence'
      });

      if (result.data.error) throw new Error(result.data.error);
      return result.data;
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
      const predictOutcomeFn = httpsCallable(functions, 'ai-treatment-assistant');
      const result = await predictOutcomeFn({
        patientId,
        action: 'predict_outcome'
      });

      if (result.data.error) throw new Error(result.data.error);
      return result.data;
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
