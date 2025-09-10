// Basic hooks
import { useState } from 'react';

export const useToast = () => ({
  toast: ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
    console.log(`Toast: ${title} - ${description}`);
  }
});

export const useAuth = () => ({
  user: { id: '1', email: 'admin@fisioflow.com.br' },
  loading: false,
  signIn: () => Promise.resolve({ data: {}, error: null }),
  signOut: () => Promise.resolve()
});

export const useAppointments = () => ({
  appointments: [
    { id: '1', date: '2024-01-15', time: '09:00', type: 'Fisioterapia', status: 'Confirmado', patient_name: 'João Silva' }
  ],
  loading: false,
  error: null
});

export const useData = () => ({
  patients: [
    { id: '1', name: 'João Silva', email: 'joao@email.com' }
  ],
  appointments: [
    { id: '1', patient_name: 'João Silva', time: '09:00', type: 'Fisioterapia' }
  ],
  isLoading: false
});

export const useIntelligentPreload = () => ({});
export const useFileUpload = () => ({});
export const useFormField = () => ({});
export const useSidebar = () => ({ collapsed: false });