/**
 * useGoogleDocs - Hook para integração com Google Docs via Cloud Functions
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

// Placeholders constants
export const CLINICAL_REPORT_PLACEHOLDERS = {
  PACIENTE_NOME: 'Nome completo do paciente',
  PACIENTE_CPF: 'CPF do paciente',
  PACIENTE_DATA_NASCIMENTO: 'Data de nascimento',
  QUEIXA_PRINCIPAL: 'Queixa principal',
  DIAGNOSTICO: 'Diagnóstico',
  PLANO_TRATAMENTO: 'Plano de tratamento',
};

export const CERTIFICATE_PLACEHOLDERS = {
  PACIENTE_NOME: 'Nome do paciente',
  CERTIFICADO_TIPO: 'Tipo de certificado',
  PERIODO_INICIO: 'Início',
  PERIODO_FIM: 'Fim',
};

export const DECLARATION_PLACEHOLDERS = {
  PACIENTE_NOME: 'Nome do paciente',
  DATA_ATENDIMENTO: 'Data',
  HORARIO_ATENDIMENTO: 'Horário',
};

export function useGoogleDocs() {
  const queryClient = useQueryClient();

  // Listar templates via Cloud Function
  const listTemplates = useCallback(async (folderId?: string) => {
    const listGoogleTemplates = httpsCallable(functions, 'listGoogleTemplates');
    const result = await listGoogleTemplates({ folderId });
    return (result.data as any).templates || [];
  }, []);

  // Gerar relatório a partir de template via Cloud Function
  const generateReport = useMutation({
    mutationFn: async ({
      templateId,
      patientName,
      data,
      folderId,
    }: {
      templateId: string;
      patientName: string;
      data: Record<string, string>;
      folderId?: string;
    }) => {
      const generateGoogleReport = httpsCallable(functions, 'generateGoogleReport');
      const result = await generateGoogleReport({
        templateId,
        patientName,
        data,
        folderId,
      });
      return result.data as { success: boolean; fileId: string; webViewLink: string };
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Relatório gerado com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['drive-files'] });
      }
    },
    onError: (error) => {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório. Verifique suas permissões do Google.');
    },
  });

  // Criar pasta do paciente
  const createPatientFolder = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string }) => {
      const createPatientDriveFolder = httpsCallable(functions, 'createPatientDriveFolder');
      const result = await createPatientDriveFolder({ name, parentId });
      return result.data as { folderId: string };
    },
    onSuccess: () => {
      toast.success('Pasta do paciente criada no Google Drive');
    }
  });

  return {
    listTemplates,
    generateReport: generateReport.mutate,
    isGenerating: generateReport.isPending,
    createPatientFolder: createPatientFolder.mutate,
    isCreatingFolder: createPatientFolder.isPending,
    
    // Constants
    CLINICAL_REPORT_PLACEHOLDERS,
    CERTIFICATE_PLACEHOLDERS,
    DECLARATION_PLACEHOLDERS,
  };
}

export default useGoogleDocs;
