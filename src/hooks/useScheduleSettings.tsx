import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ScheduleSettings {
  id: string;
  therapist_id: string;
  day_of_week: number; // 0=domingo, 6=sábado
  start_time: string;
  end_time: string;
  break_start?: string;
  break_end?: string;
  consultation_duration: number;
  active: boolean;
}

export function useScheduleSettings() {
  const [settings, setSettings] = useState<ScheduleSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schedule_settings')
        .select('*')
        .order('therapist_id', { ascending: true })
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const addSettings = async (settingsData: Omit<ScheduleSettings, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('schedule_settings')
        .insert(settingsData)
        .select()
        .single();

      if (error) throw error;
      await fetchSettings();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar configuração');
      throw err;
    }
  };

  const updateSettings = async (id: string, updates: Partial<ScheduleSettings>) => {
    try {
      const { error } = await supabase
        .from('schedule_settings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar configuração');
      throw err;
    }
  };

  const deleteSettings = async (id: string) => {
    try {
      const { error } = await supabase
        .from('schedule_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir configuração');
      throw err;
    }
  };

  const getSettingsForTherapist = (therapistId: string) => {
    return settings.filter(s => s.therapist_id === therapistId && s.active);
  };

  const getWorkingHours = (therapistId: string, dayOfWeek: number) => {
    return settings.find(s => 
      s.therapist_id === therapistId && 
      s.day_of_week === dayOfWeek && 
      s.active
    );
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    addSettings,
    updateSettings,
    deleteSettings,
    getSettingsForTherapist,
    getWorkingHours,
    refetch: fetchSettings,
  };
}