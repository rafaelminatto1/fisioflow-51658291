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

interface DataContextType {
  // Dados mockados
  patients: any[];
  appointments: any[];
  
  // Funções mockadas para evitar erros de tipo
  addPatient: (patient: any) => Promise<any>;
  updatePatient: (id: string, patient: any) => Promise<any>;
  deletePatient: (id: string) => Promise<void>;
  addAppointment: (appointment: any) => Promise<any>;
  updateAppointment: (id: string, appointment: any) => Promise<any>;
  deleteAppointment: (id: string) => Promise<void>;
  addExercise: (exercise: any) => Promise<any>;
  addExercisePlan: (plan: any) => Promise<any>;
  addMedicalRecord: (record: any) => Promise<any>;
  addTreatmentSession: (session: any) => Promise<any>;
  updateTreatmentSession: (id: string, session: any) => Promise<void>;
  addSOAPRecord: (record: any) => Promise<any>;
  updateSOAPRecord: (id: string, record: any) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  // Implementações mockadas para evitar erros
  const addPatient = async (patientData: any) => {
    console.log('Mock addPatient called with:', patientData);
    return { id: 'mock-id', ...patientData, status: 'active', progress: 0 };
  };

  const addAppointment = async (appointmentData: any) => {
    console.log('Mock addAppointment called with:', appointmentData);
    return { id: 'mock-id', ...appointmentData };
  };

  const addExercise = async (exerciseData: any) => {
    console.log('Mock addExercise called with:', exerciseData);
    return { id: 'mock-id', ...exerciseData };
  };

  const addExercisePlan = async (planData: any) => {
    console.log('Mock addExercisePlan called with:', planData);
    return { id: 'mock-id', ...planData };
  };

  const addMedicalRecord = async (recordData: any) => {
    console.log('Mock addMedicalRecord called with:', recordData);
    return { id: 'mock-id', ...recordData };
  };

  const addTreatmentSession = async (sessionData: any) => {
    console.log('Mock addTreatmentSession called with:', sessionData);
    return { id: 'mock-id', ...sessionData };
  };

  const updateTreatmentSession = async (id: string, updates: any) => {
    console.log('Mock updateTreatmentSession called with:', id, updates);
  };

  const addSOAPRecord = async (recordData: any) => {
    console.log('Mock addSOAPRecord called with:', recordData);
    return { id: 'mock-id', ...recordData };
  };

  const updatePatient = async (id: string, patientData: any) => {
    console.log('Mock updatePatient called with:', id, patientData);
    return { id, ...patientData };
  };

  const deletePatient = async (id: string) => {
    console.log('Mock deletePatient called with:', id);
  };

  const updateAppointment = async (id: string, appointmentData: any) => {
    console.log('Mock updateAppointment called with:', id, appointmentData);
    return { id, ...appointmentData };
  };

  const deleteAppointment = async (id: string) => {
    console.log('Mock deleteAppointment called with:', id);
  };

  const updateSOAPRecord = async (id: string, updates: any) => {
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