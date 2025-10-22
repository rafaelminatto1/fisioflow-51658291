import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PainMapService } from '@/lib/services/painMapService';
import type { PainMapFormData } from '@/types/painMap';
import { toast } from '@/hooks/use-toast';

export function usePainMaps(patientId: string) {
  return useQuery({
    queryKey: ['pain-maps', patientId],
    queryFn: () => PainMapService.getPainMapsByPatientId(patientId),
    enabled: !!patientId
  });
}

export function usePainEvolution(patientId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['pain-evolution', patientId, startDate, endDate],
    queryFn: () => PainMapService.getPainEvolution(patientId, startDate, endDate),
    enabled: !!patientId
  });
}

export function usePainStatistics(patientId: string) {
  return useQuery({
    queryKey: ['pain-statistics', patientId],
    queryFn: () => PainMapService.getPainStatistics(patientId),
    enabled: !!patientId
  });
}

export function useCreatePainMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PainMapFormData) => PainMapService.createPainMap(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pain-maps', variables.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['pain-evolution', variables.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['pain-statistics', variables.patient_id] });
      toast({
        title: 'Mapa de dor salvo',
        description: 'O registro de dor foi salvo com sucesso.'
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o mapa de dor.',
        variant: 'destructive'
      });
    }
  });
}

export function useUpdatePainMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PainMapFormData> }) =>
      PainMapService.updatePainMap(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pain-maps', data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['pain-evolution', data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['pain-statistics', data.patient_id] });
      toast({
        title: 'Atualizado',
        description: 'Mapa de dor atualizado com sucesso.'
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar.',
        variant: 'destructive'
      });
    }
  });
}

export function useDeletePainMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PainMapService.deletePainMap(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pain-maps'] });
      toast({
        title: 'Removido',
        description: 'Mapa de dor removido com sucesso.'
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover.',
        variant: 'destructive'
      });
    }
  });
}
