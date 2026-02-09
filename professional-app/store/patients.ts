import { create } from 'zustand';
import type { Patient } from '@/types';

interface PatientsState {
  patients: Patient[];
  setPatients: (patients: Patient[]) => void;
  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  removePatient: (id: string) => void;
  getPatientById: (id: string) => Patient | undefined;
}

export const usePatientsStore = create<PatientsState>((set, get) => ({
  patients: [],
  setPatients: (patients) => set({ patients }),
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
