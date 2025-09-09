import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type SOAPRecord = Database['public']['Tables']['soap_records']['Row'];
type SOAPRecordInsert = Database['public']['Tables']['soap_records']['Insert'];
type SOAPRecordUpdate = Database['public']['Tables']['soap_records']['Update'];

// Extended types for better UI handling
export interface ExtendedSOAPRecord extends SOAPRecord {
  patient?: {
    id: string;
    name: string;
    email: string;
  };
  appointment?: {
    id: string;
    date: string;
    time: string;
  };
}

// Types for specific SOAP sections with healthcare-specific fields
export interface SubjectiveData {
  chief_complaint: string;
  pain_level: number; // 0-10 scale
  pain_location: string[];
  pain_quality: string;
  pain_duration: string;
  aggravating_factors: string[];
  relieving_factors: string[];
  functional_limitations: string[];
  previous_treatments: string;
  medications: string;
  sleep_quality: string;
  activity_level: string;
  patient_goals: string[];
}

export interface ObjectiveData {
  vital_signs: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    respiratory_rate?: number;
  };
  observation: {
    posture: string;
    gait: string;
    skin_condition: string;
    swelling: boolean;
    deformities: string;
  };
  palpation: {
    muscle_tone: string;
    tenderness: string[];
    temperature: string;
    swelling_details: string;
  };
  range_of_motion: {
    joint: string;
    active_rom: number;
    passive_rom: number;
    pain_with_motion: boolean;
    end_feel: string;
  }[];
  muscle_testing: {
    muscle_group: string;
    strength_grade: string; // 0-5 scale
    pain_with_test: boolean;
  }[];
  special_tests: {
    test_name: string;
    result: 'positive' | 'negative';
    notes: string;
  }[];
  measurements: {
    circumference?: { location: string; value: number }[];
    length?: { segment: string; value: number }[];
  };
  photos: {
    url: string;
    description: string;
    annotations?: Record<string, unknown>;
  }[];
}

export interface AssessmentData {
  primary_diagnosis: string;
  secondary_diagnoses: string[];
  impairments: string[];
  functional_limitations: string[];
  participation_restrictions: string[];
  prognosis: 'excellent' | 'good' | 'fair' | 'poor';
  rehabilitation_potential: 'excellent' | 'good' | 'fair' | 'poor';
  precautions: string[];
  contraindications: string[];
  goals: {
    short_term: { goal: string; timeframe: string; measurable_outcome: string }[];
    long_term: { goal: string; timeframe: string; measurable_outcome: string }[];
  };
}

export interface PlanData {
  treatment_frequency: string;
  treatment_duration: string;
  interventions: {
    category: string;
    techniques: string[];
    parameters: Record<string, unknown>;
  }[];
  home_exercise_program: {
    exercise: string;
    sets: number;
    reps: number;
    frequency: string;
    duration: string;
  }[];
  patient_education: string[];
  discharge_criteria: string[];
  next_visit: {
    scheduled_date: string;
    focus_areas: string[];
    expected_progress: string;
  };
  referrals: {
    provider: string;
    reason: string;
    urgency: 'routine' | 'urgent' | 'stat';
  }[];
}

export interface FunctionalTest {
  test_name: string;
  category: 'balance' | 'strength' | 'endurance' | 'flexibility' | 'functional';
  score: number;
  max_score: number;
  interpretation: string;
  notes: string;
  date_performed: string;
}

export function useSOAPRecords() {
  const [records, setRecords] = useState<ExtendedSOAPRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch all SOAP records with patient and appointment details
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('soap_records')
        .select(`
          *,
          patient:patients(
            id,
            name,
            email
          ),
          appointment:appointments(
            id,
            date,
            start_time
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRecords(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch SOAP records';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Get SOAP records for a specific patient
  const getRecordsByPatient = async (patientId: string): Promise<ExtendedSOAPRecord[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('soap_records')
        .select(`
          *,
          patient:patients(
            id,
            name,
            email
          ),
          appointment:appointments(
            id,
            date,
            start_time
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch patient SOAP records';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Add a new SOAP record
  const addRecord = async (recordData: SOAPRecordInsert): Promise<SOAPRecord | null> => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Get next session number for the patient
      const { data: lastRecord } = await supabase
        .from('soap_records')
        .select('session_number')
        .eq('patient_id', recordData.patient_id)
        .order('session_number', { ascending: false })
        .limit(1)
        .single();

      const nextSessionNumber = (lastRecord?.session_number || 0) + 1;

      const { data, error } = await supabase
        .from('soap_records')
        .insert({
          ...recordData,
          created_by: user.id,
          session_number: nextSessionNumber,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Registro SOAP criado com sucesso!',
      });

      // Refresh the records list
      await fetchRecords();

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create SOAP record';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing SOAP record
  const updateRecord = async (id: string, updates: SOAPRecordUpdate): Promise<SOAPRecord | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('soap_records')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Registro SOAP atualizado com sucesso!',
      });

      // Refresh the records list
      await fetchRecords();

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update SOAP record';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Sign a SOAP record with digital signature
  const signRecord = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Create signature hash (simplified - in production, use proper digital signature)
      const signatureData = {
        record_id: id,
        user_id: user.id,
        timestamp: new Date().toISOString(),
      };
      const signatureHash = btoa(JSON.stringify(signatureData));

      const { error } = await supabase
        .from('soap_records')
        .update({
          signature_hash: signatureHash,
          signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Registro SOAP assinado digitalmente!',
      });

      // Refresh the records list
      await fetchRecords();

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign SOAP record';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete a SOAP record (with confirmation)
  const deleteRecord = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('soap_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Registro SOAP deletado com sucesso!',
      });

      // Refresh the records list
      await fetchRecords();

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete SOAP record';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get SOAP record by ID
  const getRecordById = async (id: string): Promise<ExtendedSOAPRecord | null> => {
    try {
      const { data, error } = await supabase
        .from('soap_records')
        .select(`
          *,
          patient:patients(
            id,
            name,
            email
          ),
          appointment:appointments(
            id,
            date,
            start_time
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch SOAP record';
      setError(errorMessage);
      return null;
    }
  };

  // Get session history for progress tracking
  const getSessionHistory = async (patientId: string): Promise<SOAPRecord[]> => {
    try {
      const { data, error } = await supabase
        .from('soap_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('session_number', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch session history';
      setError(errorMessage);
      return [];
    }
  };

  // Export SOAP record to PDF (placeholder for future implementation)
  const exportToPDF = async (_id: string): Promise<boolean> => {
    try {
      setLoading(true);
      // TODO: Implement PDF export functionality
      toast({
        title: 'Em desenvolvimento',
        description: 'Funcionalidade de exportação para PDF em breve!',
      });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDF';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Initialize - fetch records on mount
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return {
    records,
    loading,
    error,
    fetchRecords,
    getRecordsByPatient,
    getRecordById,
    getSessionHistory,
    addRecord,
    updateRecord,
    signRecord,
    deleteRecord,
    exportToPDF,
  };
}