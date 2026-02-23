import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Appointment } from '@/types';

export interface AppointmentsState {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  selectedDate: Date | null;
  fetchAppointments: (date?: Date) => Promise<void>;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  addAppointment: (appointment: Appointment) => void;
  deleteAppointment: (id: string) => void;
  setSelectedDate: (date: Date | null) => void;
  clearError: () => void;
}

export const useAppointmentsStore = create<AppointmentsState>()(
  persist(
    (set) => ({
      appointments: [],
      isLoading: false,
      error: null,
      selectedDate: null,

      fetchAppointments: async (date) => {
        set({ isLoading: true, error: null });
        try {
          // Aqui seria chamada a API ou Firebase
          // const response = await fetchAppointments(date);
          // set({ appointments: response.data, isLoading: false });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Erro ao buscar agendamentos',
          });
        }
      },

      updateAppointment: (id, data) => {
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id ? { ...a, ...data } : a
          ),
        }));
      },

      addAppointment: (appointment) => {
        set((state) => ({
          appointments: [...state.appointments, appointment],
        }));
      },

      deleteAppointment: (id) => {
        set((state) => ({
          appointments: state.appointments.filter((a) => a.id !== id),
        }));
      },

      setSelectedDate: (date) => {
        set({ selectedDate: date });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'appointments-storage',
      partialize: (state) => {
        // Persistir apenas campos essenciais para economizar espaço
        return {
          appointments: state.appointments,
          isLoading: false, // Não persistir loading state
          selectedDate: state.selectedDate,
          error: null, // Não persistir erro
        } as Partial<AppointmentsState>;
      },
    }
  )
);

// Selectors derivados para acesso otimizado
export const useAppointmentsSelectors = () => {
  return useAppointmentsStore((state) => ({
    appointmentsForDate: (date: Date) => {
      if (!date) return state.appointments;

      return state.appointments.filter((a) => {
        const appointmentDate = new Date(a.date);
        const filterDate = new Date(date);
        return (
          appointmentDate.getDate() === filterDate.getDate() &&
          appointmentDate.getMonth() === filterDate.getMonth() &&
          appointmentDate.getFullYear() === filterDate.getFullYear()
        );
      });
    },
    upcomingAppointments: () => {
      const now = new Date();
      return state.appointments.filter((a) => new Date(a.date) >= now);
    },
    pastAppointments: () => {
      const now = new Date();
      return state.appointments.filter((a) => new Date(a.date) < now);
    },
    totalAppointments: () => state.appointments.length,
    isLoading: state.isLoading,
    hasError: !!state.error,
  }));
};
