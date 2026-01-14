// Basic hooks
export const useNavPreload = () => ({});

export const useFileUpload = (_options?: unknown) => ({
  isUploading: false,
  progress: 0,
  uploadedFiles: [],
  upload: (_files: File[]) => Promise.resolve(),
  removeFile: (_id: string) => { },
  UseFileUploadOptions: {}
});

export { useFormField, FormFieldContext, FormItemContext } from './useFormField';

export { useSidebarProvider, SidebarContext } from './useSidebar';
export { useSidebar } from './useSidebar';
export { useIsMobile } from './use-mobile';

// Error handling
export {
  useErrorHandler,
  useAsyncOperation,
  getErrorMessageFromStatus,
  extractErrorInfo
} from './useErrorHandler';
export type {
  ApiErrorOptions,
  AsyncOperationResult,
  UseErrorHandlerReturn
} from './useErrorHandler';

// Real hooks from separate files
export { useAuth } from './useAuth';
export { useData } from './useData';
export { useAppointments } from './useAppointments';
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
export { useConnectionStatus, type ConnectionStatus, type ConnectionState } from './useConnectionStatus';

// Re-export toast from the UI components to avoid circular dependency
export { useToast, toast } from '@/components/ui/use-toast';