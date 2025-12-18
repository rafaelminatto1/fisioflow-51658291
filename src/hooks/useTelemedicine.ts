import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TelemedicineRoom {
  id: string;
  organization_id: string;
  patient_id: string;
  therapist_id: string;
  appointment_id: string | null;
  room_code: string;
  status: 'aguardando' | 'ativo' | 'encerrado';
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  recording_url: string | null;
  notas: string | null;
  created_at: string;
}

export function useTelemedicineRooms() {
  return useQuery({
    queryKey: ['telemedicine-rooms'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();
      
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('telemedicine_rooms')
        .select(`
          *,
          patients:patient_id (name, email, phone),
          profiles:therapist_id (full_name)
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
}

export function useCreateTelemedicineRoom() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { patient_id: string; scheduled_at?: string; appointment_id?: string }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, organization_id')
        .single();
      
      if (!profile?.organization_id) throw new Error('Organização não encontrada');
      
      // Generate unique room code
      const roomCode = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
      
      const { data: result, error } = await supabase
        .from('telemedicine_rooms')
        .insert({
          ...data,
          organization_id: profile.organization_id,
          therapist_id: profile.id,
          room_code: roomCode,
          status: 'aguardando'
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemedicine-rooms'] });
      toast.success('Sala de telemedicina criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar sala: ' + error.message);
    }
  });
}

export function useUpdateTelemedicineRoom() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<TelemedicineRoom> & { id: string }) => {
      const { error } = await supabase
        .from('telemedicine_rooms')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemedicine-rooms'] });
      toast.success('Sala atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });
}
