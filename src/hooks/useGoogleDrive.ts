/**
 * useGoogleDrive - Hook para integração com Google Drive
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DriveService } from '@/lib/integrations/google/drive';

interface UseGoogleDriveOptions {
  accessToken?: string;
}

export function useGoogleDrive(options: UseGoogleDriveOptions = {}) {
  const { accessToken } = options;
  const queryClient = useQueryClient();

  // Listar arquivos
  const listFiles = useCallback(async (folderId?: string) => {
    if (!accessToken) throw new Error('Access token não fornecido');

    const service = new DriveService(accessToken);
    return service.listFiles({ folderId });
  }, [accessToken]);

  // Criar pasta do paciente
  const createPatientFolders = useMutation({
    mutationFn: async ({
      tenantId,
      patientId,
      patientName,
    }: {
      tenantId: string;
      patientId: string;
      patientName: string;
    }) => {
      if (!accessToken) throw new Error('Access token não fornecido');

      const service = new DriveService(accessToken);
      return service.createPatientFolderStructure(tenantId, patientId, patientName);
    },
    onSuccess: () => {
      toast.success('Pastas criadas no Google Drive');
      queryClient.invalidateQueries({ queryKey: ['drive-files'] });
    },
    onError: (error) => {
      console.error('Erro ao criar pastas:', error);
      toast.error('Erro ao criar pastas no Google Drive');
    },
  });

  // Upload de PDF
  const uploadPdf = useMutation({
    mutationFn: async ({
      fileName,
      pdfBuffer,
      folderId,
    }: {
      fileName: string;
      pdfBuffer: Buffer;
      folderId?: string;
    }) => {
      if (!accessToken) throw new Error('Access token não fornecido');

      const service = new DriveService(accessToken);
      return service.uploadPdf(fileName, pdfBuffer, folderId);
    },
    onSuccess: (data) => {
      toast.success('PDF salvo no Google Drive');
      return data;
    },
    onError: (error) => {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao salvar PDF no Google Drive');
    },
  });

  // Compartilhar arquivo
  const shareFile = useMutation({
    mutationFn: async ({
      fileId,
      email,
      role,
    }: {
      fileId: string;
      email: string;
      role?: 'reader' | 'writer';
    }) => {
      if (!accessToken) throw new Error('Access token não fornecido');

      const service = new DriveService(accessToken);
      return service.shareFile(fileId, email, role, true);
    },
    onSuccess: () => {
      toast.success('Arquivo compartilhado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao compartilhar:', error);
      toast.error('Erro ao compartilhar arquivo');
    },
  });

  // Obter link compartilhável
  const getShareableLink = useCallback(async (fileId: string): Promise<string> => {
    if (!accessToken) throw new Error('Access token não fornecido');

    const service = new DriveService(accessToken);
    return service.getShareableLink(fileId);
  }, [accessToken]);

  // Buscar PDFs
  const getPdfs = useCallback(async (folderId?: string) => {
    if (!accessToken) throw new Error('Access token não fornecido');

    const service = new DriveService(accessToken);
    return service.getPdfs(folderId);
  }, [accessToken]);

  // Buscar Google Docs
  const getGoogleDocs = useCallback(async (folderId?: string) => {
    if (!accessToken) throw new Error('Access token não fornecido');

    const service = new DriveService(accessToken);
    return service.getGoogleDocs(folderId);
  }, [accessToken]);

  return {
    // Queries
    listFiles,
    getPdfs,
    getGoogleDocs,
    getShareableLink,

    // Mutations
    createPatientFolders: createPatientFolders.mutate,
    uploadPdf: uploadPdf.mutate,
    shareFile: shareFile.mutate,

    // Loading states
    isCreatingFolders: createPatientFolders.isPending,
    isUploading: uploadPdf.isPending,
    isSharing: shareFile.isPending,
  };
}

export default useGoogleDrive;
