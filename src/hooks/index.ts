// Basic hooks
import { useState } from 'react';

export const useToast = () => ({
  toast: ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
    console.log(`Toast: ${title} - ${description}`);
  },
  toasts: []
});

export const toast = ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
  console.log(`Toast: ${title} - ${description}`);
};

export const useAuth = () => ({
  user: { id: '1', email: 'admin@fisioflow.com.br' },
  loading: false,
  profile: { role: 'admin', full_name: 'Admin', avatar_url: '' },
  userProfile: { role: 'admin', full_name: 'Admin', avatar_url: '' },
  initialized: true,
  sessionCheckFailed: false,
  role: 'admin' as const,
  refreshProfile: () => Promise.resolve(),
  signIn: () => Promise.resolve({ data: {}, error: null }),
  signOut: () => Promise.resolve()
});

export const useAppointments = () => ({
  appointments: [
    { 
      id: '1', 
      date: '2024-01-15', 
      time: '09:00', 
      type: 'Fisioterapia', 
      status: 'Confirmado', 
      patient_name: 'João Silva' 
    }
  ],
  loading: false,
  error: null
});

export const useData = () => ({
  patients: [
    { 
      id: '1', 
      name: 'João Silva', 
      email: 'joao@email.com',
      updatedAt: '2024-01-15',
      mainCondition: 'Dor nas costas',
      status: 'Em Tratamento',
      progress: 75
    }
  ],
  appointments: [
    { 
      id: '1', 
      patient_name: 'João Silva', 
      time: '09:00', 
      type: 'Fisioterapia',
      date: '2024-01-15',
      status: 'Confirmado'
    }
  ],
  isLoading: false
});

export const useNavPreload = () => ({});

export interface UseFileUploadOptions {}
export const useFileUpload = (options?: any) => ({
  isUploading: false,
  progress: 0,
  uploadedFiles: [],
  upload: (files: File[]) => Promise.resolve(),
  removeFile: (id: string) => {},
  UseFileUploadOptions: {}
});

export { useFormField, FormFieldContext, FormItemContext } from './useFormField';

export { useSidebarProvider, SidebarContext } from './useSidebar';
export { useSidebar } from './useSidebar';
export { useIsMobile } from './use-mobile';

// Real hooks from separate files
export { useAuth as useAuthReal } from './useAuth';
export { useData as useDataReal } from './useData';
export { useAppointments as useAppointmentsReal } from './useAppointments';
export { usePatients } from './usePatients';
export { useExercises } from './useExercises';
export { useTransacoes, useCreateTransacao, useUpdateTransacao } from './useTransacoes';
export { useEmpresasParceiras, useCreateEmpresaParceira, useUpdateEmpresaParceira, useDeleteEmpresaParceira } from './useEmpresasParceiras';
export { useDashboardStats } from './useDashboardStats';
export { useAppointmentActions } from './useAppointmentActions';
export { useAutoSave } from './useAutoSave';
export { useOfflineSync } from './useOfflineSync';
export { useIntelligentPreload } from './useIntelligentPreload';
export { useExerciseTemplates, useTemplateItems } from './useExerciseTemplates';
export { useApplyExerciseTemplate } from './useApplyExerciseTemplate';
export { useWaitlist, useWaitlistOffers } from './useWaitlist';
export { useWhatsAppConfirmations } from './useWhatsAppConfirmations';
export { usePainMaps } from './usePainMaps';
export { usePatientDocuments } from './usePatientDocuments';
export { useConductLibrary } from './useConductLibrary';
export { useOrganizations } from './useOrganizations';
export { useOrganizationMembers } from './useOrganizationMembers';

// Add toasts array for useToast
export const useToastHook = () => ({
  toast: ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
    console.log(`Toast: ${title} - ${description}`);
  },
  toasts: []
});