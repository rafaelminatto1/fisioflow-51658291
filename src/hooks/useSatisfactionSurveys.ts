/**
 * useSatisfactionSurveys - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOrganizations } from '@/hooks/useOrganizations';
import { satisfactionSurveysApi } from '@/lib/api/workers-client';

export interface SatisfactionSurvey {
  id: string;
  organization_id: string;
  patient_id: string;
  appointment_id: string | null;
  therapist_id: string | null;
  nps_score: number | null;
  q_care_quality: number | null;
  q_professionalism: number | null;
  q_facility_cleanliness: number | null;
  q_scheduling_ease: number | null;
  q_communication: number | null;
  comments: string | null;
  suggestions: string | null;
  sent_at: string;
  responded_at: string | null;
  response_time_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSurveyData {
  patient_id: string;
  appointment_id?: string;
  therapist_id?: string;
  nps_score: number;
  q_care_quality?: number;
  q_professionalism?: number;
  q_facility_cleanliness?: number;
  q_scheduling_ease?: number;
  q_communication?: number;
  comments?: string;
  suggestions?: string;
}

export interface SurveyFilters {
  patient_id?: string;
  therapist_id?: string;
  start_date?: string;
  end_date?: string;
  responded?: boolean;
}

export function useSatisfactionSurveys(filters?: SurveyFilters) {
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['satisfaction-surveys', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      const result = await satisfactionSurveysApi.list({
        patientId: filters?.patient_id,
        therapistId: filters?.therapist_id,
        startDate: filters?.start_date,
        endDate: filters?.end_date,
        responded: filters?.responded,
      });
      return (result.data ?? []) as SatisfactionSurvey[];
    },
    enabled: !!organizationId,
  });
}

export function useSurveyStats() {
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['survey-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const result = await satisfactionSurveysApi.stats();
      return result.data ?? null;
    },
    enabled: !!organizationId,
  });
}

export function useCreateSurvey() {
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSurveyData) => {
      if (!organizationId) throw new Error('Organização não encontrada');
      const result = await satisfactionSurveysApi.create(data as Record<string, unknown>);
      return result.data as SatisfactionSurvey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['satisfaction-surveys', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats', organizationId] });
      toast.success('Pesquisa de satisfação registrada');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao registrar pesquisa: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    },
  });
}

export function useUpdateSurvey() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateSurveyData> & { id: string }) => {
      const result = await satisfactionSurveysApi.update(id, data as Record<string, unknown>);
      return result.data as SatisfactionSurvey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['satisfaction-surveys', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats', organizationId] });
      toast.success('Pesquisa atualizada');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao atualizar pesquisa: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    },
  });
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;

  return useMutation({
    mutationFn: async (id: string) => {
      await satisfactionSurveysApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['satisfaction-surveys', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats', organizationId] });
      toast.success('Pesquisa removida');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao remover pesquisa: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    },
  });
}
