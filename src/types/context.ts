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

export interface DataContextType {
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