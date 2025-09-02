import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SOAPRecord } from '@/types';

export function useSOAPRecords() {
  const [records, setRecords] = useState<SOAPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('soap_records')
        .select('*')
        .order('session_number', { ascending: false });

      if (error) throw error;

      const formattedRecords: SOAPRecord[] = data?.map(record => ({
        id: record.id,
        patientId: record.patient_id,
        appointmentId: record.appointment_id,
        sessionNumber: record.session_number,
        subjective: record.subjective,
        objective: record.objective,
        assessment: record.assessment,
        plan: record.plan,
        vitalSigns: record.vital_signs,
        functionalTests: record.functional_tests,
        createdBy: record.created_by,
        createdAt: new Date(record.created_at),
        updatedAt: new Date(record.updated_at),
        signedAt: record.signed_at ? new Date(record.signed_at) : undefined,
        signatureHash: record.signature_hash,
      })) || [];

      setRecords(formattedRecords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar prontuários');
    } finally {
      setLoading(false);
    }
  };

  const addRecord = async (recordData: Omit<SOAPRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('soap_records')
        .insert({
          patient_id: recordData.patientId,
          appointment_id: recordData.appointmentId,
          session_number: recordData.sessionNumber,
          subjective: recordData.subjective,
          objective: recordData.objective,
          assessment: recordData.assessment,
          plan: recordData.plan,
          vital_signs: recordData.vitalSigns,
          functional_tests: recordData.functionalTests,
          created_by: recordData.createdBy,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchRecords();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao adicionar prontuário';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateRecord = async (id: string, updates: Partial<SOAPRecord>) => {
    try {
      const updateData: any = {};
      
      if (updates.subjective !== undefined) updateData.subjective = updates.subjective;
      if (updates.objective !== undefined) updateData.objective = updates.objective;
      if (updates.assessment !== undefined) updateData.assessment = updates.assessment;
      if (updates.plan !== undefined) updateData.plan = updates.plan;
      if (updates.vitalSigns !== undefined) updateData.vital_signs = updates.vitalSigns;
      if (updates.functionalTests !== undefined) updateData.functional_tests = updates.functionalTests;

      const { error } = await supabase
        .from('soap_records')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar prontuário');
      throw err;
    }
  };

  const signRecord = async (id: string) => {
    try {
      const signatureData = {
        signed_at: new Date().toISOString(),
        signature_hash: `hash_${Date.now()}`, // Implementar hash real
      };

      const { error } = await supabase
        .from('soap_records')
        .update(signatureData)
        .eq('id', id);

      if (error) throw error;

      await fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao assinar prontuário');
      throw err;
    }
  };

  const getRecordsByPatient = (patientId: string) => {
    return records.filter(record => record.patientId === patientId);
  };

  const getLatestRecord = (patientId: string) => {
    const patientRecords = getRecordsByPatient(patientId);
    return patientRecords.length > 0 ? patientRecords[0] : null;
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return {
    records,
    loading,
    error,
    addRecord,
    updateRecord,
    signRecord,
    getRecordsByPatient,
    getLatestRecord,
    refetch: fetchRecords,
  };
}