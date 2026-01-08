import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  // Relações
  patient?: {
    id: string;
    name: string;
  };
  appointment?: {
    id: string;
    start_time: string;
  };
  therapist?: {
    id: string;
    name: string;
  };
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
  return useQuery({
    queryKey: ['satisfaction-surveys', filters],
    queryFn: async () => {
      let query = supabase
        .from('satisfaction_surveys')
        .select(`
          *,
          patient:patients(id, name),
          appointment:appointments(id, start_time)
        `)
        .order('sent_at', { ascending: false });

      if (filters?.patient_id) {
        query = query.eq('patient_id', filters.patient_id);
      }

      if (filters?.therapist_id) {
        query = query.eq('therapist_id', filters.therapist_id);
      }

      if (filters?.start_date) {
        query = query.gte('sent_at', filters.start_date);
      }

      if (filters?.end_date) {
        query = query.lte('sent_at', filters.end_date);
      }

      if (filters?.responded !== undefined) {
        if (filters.responded) {
          query = query.not('responded_at', 'is', null);
        } else {
          query = query.is('responded_at', null);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map data to expected format
      return (data || []).map((item: any) => ({
        ...item,
        therapist: item.therapist_id ? { id: item.therapist_id, name: 'Terapeuta' } : null,
      })) as SatisfactionSurvey[];
    },
  });
}

export function useSurveyStats() {
  return useQuery({
    queryKey: ['survey-stats'],
    queryFn: async () => {
      const { data: surveys, error } = await supabase
        .from('satisfaction_surveys')
        .select('nps_score, responded_at, q_care_quality, q_professionalism, q_communication');

      if (error) throw error;

      const total = surveys?.length || 0;
      const respondedSurveys = surveys?.filter(s => s.responded_at) || [];
      const respondedCount = respondedSurveys.length;

      const promotores = respondedSurveys.filter(s => s.nps_score && s.nps_score >= 9).length;
      const neutros = respondedSurveys.filter(s => s.nps_score && s.nps_score >= 7 && s.nps_score <= 8).length;
      const detratores = respondedSurveys.filter(s => s.nps_score && s.nps_score <= 6).length;

      const nps = respondedCount > 0 ? Math.round(((promotores - detratores) / respondedCount) * 100) : 0;

      const avgCareQuality = respondedCount > 0
        ? respondedSurveys.reduce((sum, s) => sum + (s.q_care_quality || 0), 0) / respondedCount
        : 0;

      const avgProfessionalism = respondedCount > 0
        ? respondedSurveys.reduce((sum, s) => sum + (s.q_professionalism || 0), 0) / respondedCount
        : 0;

      const avgCommunication = respondedCount > 0
        ? respondedSurveys.reduce((sum, s) => sum + (s.q_communication || 0), 0) / respondedCount
        : 0;

      const responseRate = total > 0 ? Math.round((respondedCount / total) * 100) : 0;

      return {
        total,
        promotores,
        neutros,
        detratores,
        nps,
        avgCareQuality: Math.round(avgCareQuality * 10) / 10,
        avgProfessionalism: Math.round(avgProfessionalism * 10) / 10,
        avgCommunication: Math.round(avgCommunication * 10) / 10,
        responseRate,
      };
    },
  });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSurveyData) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (!profile?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      const { data: survey, error } = await supabase
        .from('satisfaction_surveys')
        .insert({
          ...data,
          organization_id: profile.organization_id,
          responded_at: new Date().toISOString(),
        })
        .select(`
          *,
          patient:patients(id, name)
        `)
        .single();

      if (error) throw error;
      return survey as SatisfactionSurvey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['satisfaction-surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] });
      toast.success('Pesquisa de satisfação registrada');
    },
    onError: (error: any) => {
      toast.error('Erro ao registrar pesquisa: ' + error.message);
    },
  });
}

export function useUpdateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateSurveyData> & { id: string }) => {
      const { data: survey, error } = await supabase
        .from('satisfaction_surveys')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return survey as SatisfactionSurvey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['satisfaction-surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] });
      toast.success('Pesquisa atualizada');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar pesquisa: ' + error.message);
    },
  });
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('satisfaction_surveys')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['satisfaction-surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] });
      toast.success('Pesquisa removida');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover pesquisa: ' + error.message);
    },
  });
}

