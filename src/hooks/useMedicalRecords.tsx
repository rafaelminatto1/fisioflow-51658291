import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MedicalRecord {
  id: string;
  patient_id: string;
  type: 'Anamnese' | 'Evolução' | 'Avaliação' | 'Exame' | 'Receituário';
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useMedicalRecords() {
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedRecords: MedicalRecord[] = data?.map(record => ({
        ...record,
        type: record.type as 'Anamnese' | 'Evolução' | 'Avaliação' | 'Exame' | 'Receituário'
      })) || [];
      
      setMedicalRecords(formattedRecords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar registros médicos');
    } finally {
      setLoading(false);
    }
  };

  const addMedicalRecord = async (recordData: Omit<MedicalRecord, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .insert({
          patient_id: recordData.patient_id,
          type: recordData.type,
          title: recordData.title,
          content: recordData.content,
          created_by: 'current_user' // TODO: Replace with actual user ID
        })
        .select()
        .single();

      if (error) throw error;
      await fetchMedicalRecords();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar registro médico');
      throw err;
    }
  };

  const updateMedicalRecord = async (id: string, updates: Partial<MedicalRecord>) => {
    try {
      const updateData: any = {};
      
      if (updates.patient_id) updateData.patient_id = updates.patient_id;
      if (updates.type) updateData.type = updates.type;
      if (updates.title) updateData.title = updates.title;
      if (updates.content) updateData.content = updates.content;

      const { error } = await supabase
        .from('medical_records')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await fetchMedicalRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar registro médico');
      throw err;
    }
  };

  const deleteMedicalRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchMedicalRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir registro médico');
      throw err;
    }
  };

  const getMedicalRecord = (id: string) => {
    return medicalRecords.find(record => record.id === id);
  };

  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  return {
    medicalRecords,
    loading,
    error,
    addMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    getMedicalRecord,
    refetch: fetchMedicalRecords,
  };
}