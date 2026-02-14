/**
 * useGoogleDrive - Hook para integração com Google Drive via Cloud Functions
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export function useGoogleDrive() {
  const queryClient = useQueryClient();

  // Listar arquivos via Cloud Function
  const listFiles = useCallback(async (folderId?: string) => {
    const listGoogleFiles = httpsCallable(functions, 'listGoogleFiles');
    const result = await listGoogleFiles({ folderId });
    return (result.data as any).files || [];
  }, []);

  // Criar pasta do paciente
  const createPatientFolder = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string }) => {
      const createPatientDriveFolder = httpsCallable(functions, 'createPatientDriveFolder');
      const result = await createPatientDriveFolder({ name, parentId });
      return result.data as { folderId: string };
    },
    onSuccess: () => {
      toast.success('Pasta criada no Google Drive');
      queryClient.invalidateQueries({ queryKey: ['drive-files'] });
    },
    onError: (error) => {
      console.error('Erro ao criar pasta:', error);
      toast.error('Erro ao criar pasta no Google Drive');
    },
  });

  return {
    listFiles,
    createPatientFolder: createPatientFolder.mutate,
    isCreatingFolder: createPatientFolder.isPending,
  };
}

export default useGoogleDrive;
