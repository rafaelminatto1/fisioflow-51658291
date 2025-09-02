import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WaitingListEntry {
  id: string;
  patient_id: string;
  preferred_therapist_id?: string;
  preferred_times?: any; // JSONB
  urgency_level: number; // 1-5
  notes?: string;
  status: 'waiting' | 'contacted' | 'scheduled' | 'cancelled';
  created_at: string;
  updated_at: string;
  // Joined data
  patient_name?: string;
  patient_phone?: string;
  therapist_name?: string;
}

export function useWaitingList() {
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWaitingList = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('waiting_list')
        .select(`
          *,
          patients!waiting_list_patient_id_fkey (
            name,
            phone
          ),
          profiles!waiting_list_preferred_therapist_id_fkey (
            full_name
          )
        `)
        .order('urgency_level', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedData: WaitingListEntry[] = data?.map(entry => ({
        id: entry.id,
        patient_id: entry.patient_id,
        preferred_therapist_id: entry.preferred_therapist_id,
        preferred_times: entry.preferred_times,
        urgency_level: entry.urgency_level,
        notes: entry.notes,
        status: entry.status as 'waiting' | 'contacted' | 'scheduled' | 'cancelled',
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        patient_name: entry.patients?.name || 'Nome não encontrado',
        patient_phone: entry.patients?.phone || '',
        therapist_name: entry.profiles?.full_name || ''
      })) || [];

      setWaitingList(formattedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar lista de espera');
    } finally {
      setLoading(false);
    }
  };

  const addToWaitingList = async (entryData: Omit<WaitingListEntry, 'id' | 'created_at' | 'updated_at' | 'patient_name' | 'patient_phone' | 'therapist_name'>) => {
    try {
      const { data, error } = await supabase
        .from('waiting_list')
        .insert(entryData)
        .select()
        .single();

      if (error) throw error;
      await fetchWaitingList();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar à lista de espera');
      throw err;
    }
  };

  const updateWaitingListEntry = async (id: string, updates: Partial<WaitingListEntry>) => {
    try {
      const { error } = await supabase
        .from('waiting_list')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchWaitingList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar entrada da lista de espera');
      throw err;
    }
  };

  const removeFromWaitingList = async (id: string) => {
    try {
      const { error } = await supabase
        .from('waiting_list')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchWaitingList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover da lista de espera');
      throw err;
    }
  };

  const getWaitingByUrgency = (urgencyLevel: number) => {
    return waitingList.filter(entry => entry.urgency_level === urgencyLevel && entry.status === 'waiting');
  };

  const getWaitingByTherapist = (therapistId: string) => {
    return waitingList.filter(entry => entry.preferred_therapist_id === therapistId && entry.status === 'waiting');
  };

  useEffect(() => {
    fetchWaitingList();
  }, []);

  return {
    waitingList,
    loading,
    error,
    addToWaitingList,
    updateWaitingListEntry,
    removeFromWaitingList,
    getWaitingByUrgency,
    getWaitingByTherapist,
    refetch: fetchWaitingList,
  };
}