import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Patient } from '@/types';

export interface PatientsState {
  patients: Patient[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: string;
  fetchPatients: () => Promise<void>;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  addPatient: (patient: Patient) => void;
  deletePatient: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  clearError: () => void;
}

export const usePatientsStore = create<PatientsState>()(
  persist(
    (set, get) => ({
      patients: [],
      isLoading: false,
      error: null,
      searchQuery: '',
      statusFilter: 'all',

      fetchPatients: async () => {
        set({ isLoading: true, error: null });
        try {
          // Aqui seria chamada a API ou Firebase
          // Por enquanto mantém compatível com hook existente
          // const response = await fetchPatients();
          // set({ patients: response.data, isLoading: false });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Erro ao buscar pacientes',
          });
        }
      },

      updatePatient: (id, data) => {
        set((state) => ({
          patients: state.patients.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
      },

      addPatient: (patient) => {
        set((state) => ({
          patients: [patient, ...state.patients],
        }));
      },

      deletePatient: (id) => {
        set((state) => ({
          patients: state.patients.filter((p) => p.id !== id),
        }));
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setStatusFilter: (status) => {
        set({ statusFilter: status });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'patients-storage',
      partialize: (state) => {
        // Persistir apenas campos essenciais para economizar espaço
        return {
          patients: state.patients,
          isLoading: false, // Não persistir loading state
          searchQuery: state.searchQuery,
          statusFilter: state.statusFilter,
          error: null, // Não persistir erro
        } as Partial<PatientsState>;
      },
    }
  )
);

// Selectors derivados para acesso otimizado
export const usePatientsSelectors = () => {
  return usePatientsStore((state) => ({
    filteredPatients: () => {
      let filtered = state.patients;

      if (state.statusFilter !== 'all') {
        filtered = filtered.filter((p) => p.status === state.statusFilter);
      }

      if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter((p) =>
          p.name?.toLowerCase().includes(query) ||
          p.email?.toLowerCase().includes(query) ||
          p.phone?.includes(query)
        );
      }

      return filtered;
    },
    totalPatients: () => state.patients.length,
    isLoading: state.isLoading,
    hasError: !!state.error,
  }));
};
