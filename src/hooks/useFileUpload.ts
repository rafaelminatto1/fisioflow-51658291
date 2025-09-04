import { useState, useCallback } from 'react';
import { uploadFile, deleteFile, UploadOptions, UploadResult, STORAGE_BUCKETS } from '@/lib/supabase/storage';
import { toast } from 'sonner';

export interface UseFileUploadOptions {
  bucket: keyof typeof STORAGE_BUCKETS;
  folder?: string;
  onSuccess?: (result: UploadResult['data']) => void;
  onError?: (error: string) => void;
  showToast?: boolean;
}

export interface FileUploadState {
  isUploading: boolean;
  progress: number;
  uploadedFiles: Array<{
    id: string;
    name: string;
    path: string;
    publicUrl: string;
    size: number;
  }>;
}

export function useFileUpload(options: UseFileUploadOptions) {
  const [state, setState] = useState<FileUploadState>({
    isUploading: false,
    progress: 0,
    uploadedFiles: []
  });

  const upload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    setState(prev => ({ ...prev, isUploading: true, progress: 0 }));

    try {
      const results = [];
      
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        
        // Atualizar progresso
        setState(prev => ({ 
          ...prev, 
          progress: Math.round(((i + 0.5) / fileArray.length) * 100) 
        }));

        const uploadOptions: UploadOptions = {
          bucket: STORAGE_BUCKETS[options.bucket],
          folder: options.folder
        };

        const result = await uploadFile(file, uploadOptions);
        
        if (result.success && result.data) {
          const uploadedFile = {
            id: `${Date.now()}-${i}`,
            name: result.data.fileName,
            path: result.data.path,
            publicUrl: result.data.publicUrl,
            size: result.data.size
          };
          
          results.push(uploadedFile);
          
          // Adicionar à lista de arquivos uploadados
          setState(prev => ({
            ...prev,
            uploadedFiles: [...prev.uploadedFiles, uploadedFile]
          }));
          
          if (options.onSuccess) {
            options.onSuccess(result.data);
          }
          
          if (options.showToast !== false) {
            toast.success(`Arquivo "${file.name}" enviado com sucesso!`);
          }
        } else {
          const errorMessage = result.error || 'Erro desconhecido no upload';
          
          if (options.onError) {
            options.onError(errorMessage);
          }
          
          if (options.showToast !== false) {
            toast.error(`Erro ao enviar "${file.name}": ${errorMessage}`);
          }
        }
        
        // Atualizar progresso final do arquivo
        setState(prev => ({ 
          ...prev, 
          progress: Math.round(((i + 1) / fileArray.length) * 100) 
        }));
      }
      
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (options.onError) {
        options.onError(errorMessage);
      }
      
      if (options.showToast !== false) {
        toast.error(`Erro no upload: ${errorMessage}`);
      }
      
      return [];
    } finally {
      setState(prev => ({ ...prev, isUploading: false, progress: 0 }));
    }
  }, [options]);

  const removeFile = useCallback(async (fileId: string, filePath: string) => {
    try {
      const result = await deleteFile(STORAGE_BUCKETS[options.bucket], filePath);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          uploadedFiles: prev.uploadedFiles.filter(file => file.id !== fileId)
        }));
        
        if (options.showToast !== false) {
          toast.success('Arquivo removido com sucesso!');
        }
        
        return true;
      } else {
        if (options.showToast !== false) {
          toast.error(`Erro ao remover arquivo: ${result.error}`);
        }
        
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (options.showToast !== false) {
        toast.error(`Erro ao remover arquivo: ${errorMessage}`);
      }
      
      return false;
    }
  }, [options]);

  const clearFiles = useCallback(() => {
    setState(prev => ({ ...prev, uploadedFiles: [] }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      uploadedFiles: []
    });
  }, []);

  return {
    ...state,
    upload,
    removeFile,
    clearFiles,
    resetState
  };
}

// Hook específico para upload de documentos de pacientes
export function usePatientDocumentUpload(patientId: string, options?: Omit<UseFileUploadOptions, 'bucket' | 'folder'>) {
  return useFileUpload({
    ...options,
    bucket: 'PATIENT_DOCUMENTS',
    folder: `patients/${patientId}`
  });
}

// Hook específico para upload de avatares
export function useAvatarUpload(userId: string, options?: Omit<UseFileUploadOptions, 'bucket' | 'folder'>) {
  return useFileUpload({
    ...options,
    bucket: 'PROFILE_AVATARS',
    folder: `avatars/${userId}`
  });
}

// Hook específico para upload de mídia de exercícios
export function useExerciseMediaUpload(exerciseId: string, options?: Omit<UseFileUploadOptions, 'bucket' | 'folder'>) {
  return useFileUpload({
    ...options,
    bucket: 'EXERCISE_MEDIA',
    folder: `exercises/${exerciseId}`
  });
}

// Hook específico para upload de arquivos de tratamento
export function useTreatmentFileUpload(treatmentId: string, options?: Omit<UseFileUploadOptions, 'bucket' | 'folder'>) {
  return useFileUpload({
    ...options,
    bucket: 'TREATMENT_FILES',
    folder: `treatments/${treatmentId}`
  });
}