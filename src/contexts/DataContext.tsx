import React, { createContext, useContext } from 'react';
import { Patient, Appointment, Exercise } from '@/types';
import { usePatients } from '@/hooks/usePatients';
import { useAppointments } from '@/hooks/useAppointments';
import { useExercises } from '@/hooks/useExercises';

interface DataContextType {
  // Patients
  patients: Patient[];
  addPatient: (patient: Omit<Patient, 'id' | 'status' | 'progress' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatient: (id: string) => Patient | undefined;
  patientsLoading: boolean;

  // Appointments
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id' | 'patientName' | 'phone' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  getAppointment: (id: string) => Appointment | undefined;
  appointmentsLoading: boolean;

  // Exercises
  exercises: Exercise[];
  addExercise: (exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  updateExercise: (id: string, exercise: Partial<Exercise>) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  getExercise: (id: string) => Exercise | undefined;
  exercisesLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const {
    patients,
    loading: patientsLoading,
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
  } = usePatients();

  const {
    appointments,
    loading: appointmentsLoading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointment,
  } = useAppointments();

  const {
    exercises,
    loading: exercisesLoading,
    addExercise,
    updateExercise,
    deleteExercise,
    getExercise,
  } = useExercises();

  const value: DataContextType = {
    patients,
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
    patientsLoading,
    appointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointment,
    appointmentsLoading,
    exercises,
    addExercise,
    updateExercise,
    deleteExercise,
    getExercise,
    exercisesLoading,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}