import { create } from 'zustand';
import type { Appointment } from '@/types';

interface AppointmentsState {
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  removeAppointment: (id: string) => void;
  getAppointmentById: (id: string) => Appointment | undefined;
}

export const useAppointmentsStore = create<AppointmentsState>((set, get) => ({
  appointments: [],
  setAppointments: (appointments) => set({ appointments }),
  addAppointment: (appointment) =>
    set((state) => ({ appointments: [...state.appointments, appointment] })),
  updateAppointment: (id, data) =>
    set((state) => ({
      appointments: state.appointments.map((apt) =>
        apt.id === id ? { ...apt, ...data } : apt
      ),
    })),
  removeAppointment: (id) =>
    set((state) => ({
      appointments: state.appointments.filter((apt) => apt.id !== id),
    })),
  getAppointmentById: (id) => {
    const state = get();
    return state.appointments.find((apt) => apt.id === id);
  },
}));
