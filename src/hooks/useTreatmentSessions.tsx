import { useState } from 'react';

// Define types for treatment sessions
interface TreatmentSession {
  id: string;
  patient_id: string;
  appointment_id?: string;
  session_number?: number;
  observations: string;
  pain_level: number;
  evolution_notes: string;
  next_session_goals?: string;
  duration_minutes?: number;
  techniques_used?: string[];
  equipment_used?: string[];
  homework_assigned?: string;
  patient_response?: string;
  attachments?: Record<string, unknown>;
  exercise_plan_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CreateTreatmentSessionData {
  patient_id: string;
  appointment_id?: string;
  session_number?: number;
  observations: string;
  pain_level: number;
  evolution_notes: string;
  next_session_goals?: string;
  duration_minutes?: number;
  techniques_used?: string[];
  equipment_used?: string[];
  homework_assigned?: string;
  patient_response?: string;
  attachments?: Record<string, unknown>;
  exercise_plan_id?: string;
}

export function useTreatmentSessions() {
  const [sessions] = useState<TreatmentSession[]>([]);
  const [loading] = useState(false);

  return {
    sessions,
    loading,
    fetchSessions: async () => {},
    addSession: async (data: CreateTreatmentSessionData) => ({ 
      id: 'mock', 
      ...data, 
      created_by: 'mock-user', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    } as TreatmentSession),
    addTreatmentSession: async (data: CreateTreatmentSessionData) => ({ 
      id: 'mock', 
      ...data, 
      created_by: 'mock-user', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    } as TreatmentSession),
    updateSession: async (_id: string, _data: Partial<CreateTreatmentSessionData>) => {},
    deleteSession: async (_id: string) => {},
  };
}