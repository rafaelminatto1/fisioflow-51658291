import { create } from 'zustand';
import type { Patient } from '@/types';

interface PatientsState {
  patients: Patient[];
  isLoading: boolean;
  error: string | null;
  setPatients: (patients: Patient[]) => void;
  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  removePatient: (id: string) => void;
  getPatientById: (id: string) => Patient | undefined;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const usePatientsStore = create<PatientsState>((set, get) => ({
  patients: [],
  isLoading: false,
  error: null,
  setPatients: (patients) => set({ patients }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  addPatient: (patient) =>
    set((state) => ({ patients: [...state.patients, patient] })),

  updatePatient: (id, data) =>
    set((state) => ({
      patients: state.patients.map((patient) =>
        patient.id === id ? { ...patient, ...data } : patient
      ),
    })),

  removePatient: (id) =>
    set((state) => ({
      patients: state.patients.filter((patient) => patient.id !== id),
    })),

  getPatientById: (id) => {
    const state = get();
    return state.patients.find((patient) => patient.id === id);
  },
}));
