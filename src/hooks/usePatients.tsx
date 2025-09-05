import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Patient } from '@/types';

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPatients: Patient[] = data?.map(patient => ({
        id: patient.id,
        name: patient.name,
        email: patient.email || '',
        phone: patient.phone || '',
        birthDate: new Date(patient.birth_date),
        gender: patient.gender as 'masculino' | 'feminino' | 'outro',
        address: patient.address || '',
        emergencyContact: patient.emergency_contact || '',
        medicalHistory: patient.medical_history || '',
        mainCondition: patient.main_condition,
        status: patient.status as 'Em Tratamento' | 'Recuperação' | 'Inicial' | 'Concluído',
        progress: patient.progress,
        createdAt: new Date(patient.created_at),
        updatedAt: new Date(patient.updated_at),
      })) || [];

      setPatients(formattedPatients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const addPatient = async (patientData: Omit<Patient, 'id' | 'status' | 'progress' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert({
          name: patientData.name,
          email: patientData.email || null,
          phone: patientData.phone || null,
          birth_date: patientData.birthDate.toISOString().split('T')[0],
          gender: patientData.gender,
          address: patientData.address || null,
          emergency_contact: patientData.emergencyContact || null,
          medical_history: patientData.medicalHistory || null,
          main_condition: patientData.mainCondition,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPatients();
      return data;
    } catch (err) {
      let errorMessage = 'Erro ao adicionar paciente';
      
      if (err instanceof Error) {
        if (err.message.includes('row-level security')) {
          errorMessage = 'Erro de permissão: É necessário estar autenticado para cadastrar pacientes. Entre na sua conta primeiro.';
        } else if (err.message.includes('unique')) {
          errorMessage = 'Já existe um paciente com essas informações. Verifique os dados e tente novamente.';
        } else if (err.message.includes('not-null')) {
          errorMessage = 'Alguns campos obrigatórios não foram preenchidos. Verifique os dados e tente novamente.';
        } else {
          errorMessage = `Erro: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email || null;
      if (updates.phone !== undefined) updateData.phone = updates.phone || null;
      if (updates.birthDate) updateData.birth_date = updates.birthDate.toISOString().split('T')[0];
      if (updates.gender) updateData.gender = updates.gender;
      if (updates.address !== undefined) updateData.address = updates.address || null;
      if (updates.emergencyContact !== undefined) updateData.emergency_contact = updates.emergencyContact || null;
      if (updates.medicalHistory !== undefined) updateData.medical_history = updates.medicalHistory || null;
      if (updates.mainCondition) updateData.main_condition = updates.mainCondition;
      if (updates.status) updateData.status = updates.status;
      if (updates.progress !== undefined) updateData.progress = updates.progress;

      const { error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchPatients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar paciente');
      throw err;
    }
  };

  const deletePatient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchPatients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir paciente');
      throw err;
    }
  };

  const getPatient = (id: string) => {
    return patients.find(patient => patient.id === id);
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  return {
    patients,
    loading,
    error,
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
    fetchPatients,
    refetch: fetchPatients,
  };
}