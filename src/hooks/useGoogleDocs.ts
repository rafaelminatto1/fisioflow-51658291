/**
 * useGoogleDocs - Hook para integração com Google Docs
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DocsService,
  TextReplacement,
  GeneratedReport,
  DocsTemplate,
  CLINICAL_REPORT_PLACEHOLDERS,
  CERTIFICATE_PLACEHOLDERS,
  DECLARATION_PLACEHOLDERS,
} from '@/lib/integrations/google/docs';

interface UseGoogleDocsOptions {
  accessToken?: string;
}

export function useGoogleDocs(options: UseGoogleDocsOptions = {}) {
  const { accessToken } = options;
  const queryClient = useQueryClient();

  // Listar templates
  const listTemplates = useCallback(async (folderId?: string) => {
    if (!accessToken) throw new Error('Access token não fornecido');

    const service = new DocsService(accessToken);
    return service.listTemplates(folderId);
  }, [accessToken]);

  // Extrair placeholders do documento
  const extractPlaceholders = useCallback(async (documentId: string) => {
    if (!accessToken) throw new Error('Access token não fornecido');

    const service = new DocsService(accessToken);
    return service.extractPlaceholders(documentId);
  }, [accessToken]);

  // Gerar relatório a partir de template
  const generateReport = useMutation({
    mutationFn: async ({
      templateId,
      reportName,
      data,
      convertToPdf,
      saveToFolder,
    }: {
      templateId: string;
      reportName: string;
      data: Record<string, string>;
      convertToPdf?: boolean;
      saveToFolder?: string;
    }) => {
      if (!accessToken) throw new Error('Access token não fornecido');

      const service = new DocsService(accessToken);
      return service.generateReport(templateId, reportName, data, {
        convertToPdf,
        saveToFolder,
      });
    },
    onSuccess: (data) => {
      toast.success('Relatório gerado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['drive-files'] });
      return data;
    },
    onError: (error) => {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    },
  });

  // Gerar relatório clínico
  const generateClinicalReport = useMutation({
    mutationFn: async ({
      templateId,
      patientData,
      clinicalData,
      therapistData,
      options,
    }: {
      templateId: string;
      patientData: {
        nome: string;
        cpf?: string;
        dataNascimento?: string;
        contato?: string;
      };
      clinicalData: {
        dataAvaliacao: string;
        queixaPrincipal: string;
        historia: string;
        diagnostico: string;
        planoTratamento: string;
        observacoes?: string;
      };
      therapistData: {
        nome: string;
        registro?: string;
        assinatura?: string;
      };
      options?: {
        convertToPdf?: boolean;
        saveToFolder?: string;
      };
    }) => {
      if (!accessToken) throw new Error('Access token não fornecido');

      const service = new DocsService(accessToken);
      return service.generateClinicalReport(
        templateId,
        patientData,
        clinicalData,
        therapistData,
        options
      );
    },
    onSuccess: () => {
      toast.success('Relatório clínico gerado!');
    },
    onError: (error) => {
      console.error('Erro ao gerar relatório clínico:', error);
      toast.error('Erro ao gerar relatório clínico');
    },
  });

  // Gerar certificado
  const generateCertificate = useMutation({
    mutationFn: async ({
      templateId,
      patientData,
      certificateData,
      therapistData,
      options,
    }: {
      templateId: string;
      patientData: {
        nome: string;
        cpf?: string;
      };
      certificateData: {
        tipo: string;
        periodoInicio: string;
        periodoFim: string;
        totalSessoes: number;
      };
      therapistData: {
        nome: string;
        registro?: string;
      };
      options?: {
        convertToPdf?: boolean;
        saveToFolder?: string;
      };
    }) => {
      if (!accessToken) throw new Error('Access token não fornecido');

      const service = new DocsService(accessToken);
      return service.generateCertificate(
        templateId,
        patientData,
        certificateData,
        therapistData,
        options
      );
    },
    onSuccess: () => {
      toast.success('Certificado gerado!');
    },
    onError: (error) => {
      console.error('Erro ao gerar certificado:', error);
      toast.error('Erro ao gerar certificado');
    },
  });

  // Gerar declaração de comparecimento
  const generateAttendanceDeclaration = useMutation({
    mutationFn: async ({
      templateId,
      patientData,
      attendanceData,
      options,
    }: {
      templateId: string;
      patientData: {
        nome: string;
        cpf?: string;
      };
      attendanceData: {
        data: string;
        horario: string;
        tipoAtendimento: string;
      };
      options?: {
        convertToPdf?: boolean;
        saveToFolder?: string;
      };
    }) => {
      if (!accessToken) throw new Error('Access token não fornecido');

      const service = new DocsService(accessToken);
      return service.generateAttendanceDeclaration(
        templateId,
        patientData,
        attendanceData,
        options
      );
    },
    onSuccess: () => {
      toast.success('Declaração gerada!');
    },
    onError: (error) => {
      console.error('Erro ao gerar declaração:', error);
      toast.error('Erro ao gerar declaração');
    },
  });

  // Ler conteúdo do documento
  const getDocumentContent = useCallback(async (documentId: string) => {
    if (!accessToken) throw new Error('Access token não fornecido');

    const service = new DocsService(accessToken);
    return service.getDocumentContent(documentId);
  }, [accessToken]);

  return {
    // Queries
    listTemplates,
    extractPlaceholders,
    getDocumentContent,

    // Mutations
    generateReport: generateReport.mutate,
    generateClinicalReport: generateClinicalReport.mutate,
    generateCertificate: generateCertificate.mutate,
    generateAttendanceDeclaration: generateAttendanceDeclaration.mutate,

    // Loading states
    isGenerating: generateReport.isPending,
    isGeneratingClinical: generateClinicalReport.isPending,
    isGeneratingCertificate: generateCertificate.isPending,
    isGeneratingDeclaration: generateAttendanceDeclaration.isPending,

    // Constants
    CLINICAL_REPORT_PLACEHOLDERS,
    CERTIFICATE_PLACEHOLDERS,
    DECLARATION_PLACEHOLDERS,
  };
}

export default useGoogleDocs;
