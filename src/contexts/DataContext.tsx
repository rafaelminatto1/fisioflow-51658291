import React, { createContext, useContext, ReactNode } from 'react';

// Tipos simplificados para evitar conflitos
interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  mainCondition: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface Appointment {
  id: string;
  patientId: string;
  date: string;
  time: string;
  type: string;
  status: string;
  notes?: string;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  description: string;
}

interface ExercisePlan {
  id: string;
  name: string;
  patientId: string;
  exercises: Record<string, unknown>[];
}

interface MedicalRecord {
  id: string;
  patientId: string;
  type: string;
  title: string;
  content: string;
}

interface TreatmentSession {
  id: string;
  patientId: string;
  observations: string;
  painLevel: number;
  evolutionNotes: string;
}

interface SOAPRecord {
  id: string;
  patientId: string;
  subjective?: string;
  objective?: Record<string, unknown>;
  assessment?: string;
  plan?: Record<string, unknown>;
}

interface DataContextType {
  // Dados mockados
  patients: Patient[];
  appointments: Appointment[];
  
  // Funções mockadas para evitar erros de tipo
  addPatient: (patient: Omit<Patient, 'id' | 'progress' | 'createdAt' | 'updatedAt'>) => Promise<Patient>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<Patient>;
  deletePatient: (id: string) => Promise<void>;
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<Appointment>;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;
  addExercise: (exercise: Omit<Exercise, 'id'>) => Promise<Exercise>;
  addExercisePlan: (plan: Omit<ExercisePlan, 'id'>) => Promise<ExercisePlan>;
  addMedicalRecord: (record: Omit<MedicalRecord, 'id'>) => Promise<MedicalRecord>;
  addTreatmentSession: (session: Omit<TreatmentSession, 'id'>) => Promise<TreatmentSession>;
  updateTreatmentSession: (id: string, session: Partial<TreatmentSession>) => Promise<void>;
  addSOAPRecord: (record: Omit<SOAPRecord, 'id'>) => Promise<SOAPRecord>;
  updateSOAPRecord: (id: string, record: Partial<SOAPRecord>) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  // Implementações mockadas para evitar erros
  const addPatient = async (patientData: Omit<Patient, 'id' | 'progress' | 'createdAt' | 'updatedAt'>) => {
    console.log('Mock addPatient called with:', patientData);
    return { 
      id: 'mock-id', 
      ...patientData, 
      status: 'active', 
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  const addAppointment = async (appointmentData: Omit<Appointment, 'id'>) => {
    console.log('Mock addAppointment called with:', appointmentData);
    return { id: 'mock-id', ...appointmentData };
  };

  const addExercise = async (exerciseData: Omit<Exercise, 'id'>) => {
    console.log('Mock addExercise called with:', exerciseData);
    return { id: 'mock-id', ...exerciseData };
  };

  const addExercisePlan = async (planData: Omit<ExercisePlan, 'id'>) => {
    console.log('Mock addExercisePlan called with:', planData);
    return { id: 'mock-id', ...planData };
  };

  const addMedicalRecord = async (recordData: Omit<MedicalRecord, 'id'>) => {
    console.log('Mock addMedicalRecord called with:', recordData);
    return { id: 'mock-id', ...recordData };
  };

  const addTreatmentSession = async (sessionData: Omit<TreatmentSession, 'id'>) => {
    console.log('Mock addTreatmentSession called with:', sessionData);
    return { id: 'mock-id', ...sessionData };
  };

  const updateTreatmentSession = async (id: string, updates: Partial<TreatmentSession>) => {
    console.log('Mock updateTreatmentSession called with:', id, updates);
  };

  const addSOAPRecord = async (recordData: Omit<SOAPRecord, 'id'>) => {
    console.log('Mock addSOAPRecord called with:', recordData);
    return { id: 'mock-id', ...recordData };
  };

  const updatePatient = async (id: string, patientData: Partial<Patient>) => {
    console.log('Mock updatePatient called with:', id, patientData);
    return { id, ...patientData } as Patient;
  };

  const deletePatient = async (id: string) => {
    console.log('Mock deletePatient called with:', id);
  };

  const updateAppointment = async (id: string, appointmentData: Partial<Appointment>) => {
    console.log('Mock updateAppointment called with:', id, appointmentData);
    return { id, ...appointmentData } as Appointment;
  };

  const deleteAppointment = async (id: string) => {
    console.log('Mock deleteAppointment called with:', id);
  };

  const updateSOAPRecord = async (id: string, updates: Partial<SOAPRecord>) => {
    console.log('Mock updateSOAPRecord called with:', id, updates);
  };

  const value: DataContextType = {
    patients: [],
    appointments: [],
    addPatient,
    updatePatient,
    deletePatient,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    addExercise,
    addExercisePlan,
    addMedicalRecord,
    addTreatmentSession,
    updateTreatmentSession,
    addSOAPRecord,
    updateSOAPRecord,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData deve ser usado dentro de um DataProvider');
  }
  return context;
}