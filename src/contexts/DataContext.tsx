import React, { createContext, useContext } from 'react';
import { Patient, Appointment, Exercise } from '@/types';
import { usePatients } from '@/hooks/usePatients';
import { useAppointments } from '@/hooks/useAppointments';
import { useExercises } from '@/hooks/useExercises';
import { useExercisePlans, ExercisePlan } from '@/hooks/useExercisePlans';
import { useMedicalRecords, MedicalRecord } from '@/hooks/useMedicalRecords';
import { useTreatmentSessions, TreatmentSession } from '@/hooks/useTreatmentSessions';
import { usePatientProgress, PatientProgress } from '@/hooks/usePatientProgress';

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

  // Exercise Plans
  exercisePlans: ExercisePlan[];
  addExercisePlan: (plan: Omit<ExercisePlan, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<any>;
  updateExercisePlan: (id: string, plan: Partial<ExercisePlan>) => Promise<void>;
  deleteExercisePlan: (id: string) => Promise<void>;
  getExercisePlan: (id: string) => ExercisePlan | undefined;
  exercisePlansLoading: boolean;

  // Medical Records
  medicalRecords: MedicalRecord[];
  addMedicalRecord: (record: Omit<MedicalRecord, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<any>;
  updateMedicalRecord: (id: string, record: Partial<MedicalRecord>) => Promise<void>;
  deleteMedicalRecord: (id: string) => Promise<void>;
  getMedicalRecord: (id: string) => MedicalRecord | undefined;
  medicalRecordsLoading: boolean;

  // Treatment Sessions
  treatmentSessions: TreatmentSession[];
  addTreatmentSession: (session: Omit<TreatmentSession, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<any>;
  updateTreatmentSession: (id: string, session: Partial<TreatmentSession>) => Promise<void>;
  deleteTreatmentSession: (id: string) => Promise<void>;
  getTreatmentSession: (id: string) => TreatmentSession | undefined;
  getSessionsByPatient: (patientId: string) => TreatmentSession[];
  treatmentSessionsLoading: boolean;

  // Patient Progress
  patientProgress: PatientProgress[];
  addPatientProgress: (progress: Omit<PatientProgress, 'id' | 'created_at' | 'created_by'>) => Promise<any>;
  updatePatientProgress: (id: string, progress: Partial<PatientProgress>) => Promise<void>;
  deletePatientProgress: (id: string) => Promise<void>;
  getProgressByPatient: (patientId: string) => PatientProgress[];
  getLatestProgress: (patientId: string) => PatientProgress | null;
  patientProgressLoading: boolean;
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

  const {
    exercisePlans,
    loading: exercisePlansLoading,
    addExercisePlan,
    updateExercisePlan,
    deleteExercisePlan,
    getExercisePlan,
  } = useExercisePlans();

  const {
    medicalRecords,
    loading: medicalRecordsLoading,
    addMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    getMedicalRecord,
  } = useMedicalRecords();

  const {
    treatmentSessions,
    loading: treatmentSessionsLoading,
    addTreatmentSession,
    updateTreatmentSession,
    deleteTreatmentSession,
    getTreatmentSession,
    getSessionsByPatient,
  } = useTreatmentSessions();

  const {
    patientProgress,
    loading: patientProgressLoading,
    addPatientProgress,
    updatePatientProgress,
    deletePatientProgress,
    getProgressByPatient,
    getLatestProgress,
  } = usePatientProgress();

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
    exercisePlans,
    addExercisePlan,
    updateExercisePlan,
    deleteExercisePlan,
    getExercisePlan,
    exercisePlansLoading,
    medicalRecords,
    addMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    getMedicalRecord,
    medicalRecordsLoading,
    treatmentSessions,
    addTreatmentSession,
    updateTreatmentSession,
    deleteTreatmentSession,
    getTreatmentSession,
    getSessionsByPatient: (patientId: string) => treatmentSessions.filter(session => session.patient_id === patientId),
    treatmentSessionsLoading,
    patientProgress,
    addPatientProgress,
    updatePatientProgress,
    deletePatientProgress,
    getProgressByPatient,
    getLatestProgress,
    patientProgressLoading,
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