import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { clinicalApi, type StandardizedTestResultRow } from '@/lib/api/workers-client';

export type StandardizedTestResult = StandardizedTestResultRow;

export const useStandardizedTests = (patientId: string) => {
  return useQuery({
    queryKey: ['standardized-tests', patientId],
    queryFn: async (): Promise<StandardizedTestResult[]> => {
      const res = await clinicalApi.standardizedTests.list(patientId);
      return (res?.data ?? []) as StandardizedTestResult[];
    },
    enabled: !!patientId,
  });
};

export const useSaveStandardizedTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (testData: {
      patient_id: string;
      test_type: 'oswestry' | 'lysholm' | 'dash';
      test_name: string;
      score: number;
      max_score: number;
      interpretation: string;
      answers: Record<string, number>;
    }) => {
      const res = await clinicalApi.standardizedTests.create(testData);
      return (res?.data ?? res) as StandardizedTestResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['standardized-tests', variables.patient_id],
      });
      toast.success('Teste salvo com sucesso!');
    },
    onError: (error) => {
      logger.error('Erro ao salvar teste', error, 'useStandardizedTests');
      toast.error('Não foi possível salvar o teste');
    },
  });
};
