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
  role: 'admin' as 'admin',
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
export const useIntelligentPreload = () => ({ useNavPreload: () => ({}) });

export interface UseFileUploadOptions {}
export const useFileUpload = (options?: any) => ({
  isUploading: false,
  progress: 0,
  uploadedFiles: [],
  upload: (files: File[]) => Promise.resolve(),
  removeFile: (id: string) => {},
  UseFileUploadOptions: {}
});

export const FormFieldContext = null;
export const FormItemContext = null;
export const useFormField = () => ({
  error: null,
  formItemId: '',
  formDescriptionId: '',
  formMessageId: '',
  FormFieldContext: null,
  FormItemContext: null
});

export const useSidebarProvider = () => ({});
export const SidebarContext = null;
export const useSidebar = () => ({ 
  collapsed: false,
  isMobile: false,
  state: 'expanded',
  openMobile: false,
  setOpenMobile: () => {},
  toggleSidebar: () => {},
  useSidebarProvider: () => ({}),
  SidebarContext: null
});

// Add toasts array for useToast
export const useToastHook = () => ({
  toast: ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
    console.log(`Toast: ${title} - ${description}`);
  },
  toasts: []
});