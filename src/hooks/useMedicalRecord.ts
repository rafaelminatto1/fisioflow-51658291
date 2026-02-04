/**
 * React hooks for Medical Record operations
 *
 * Provides React Query hooks for all medical record CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  medicalRecordService,
  type AnamnesisRecord,
  type PhysicalExamination,
  type TreatmentPlan,
  type Attachment,
  type ConsultationHistory,
  type MedicalRecordSummary,
  MedicalRecordError,
} from '@/lib/services/medicalRecordService';
import { ensureProfile } from '@/lib/database/profiles';

// Query keys factory
export const medicalRecordKeys = {
  all: ['medical-records'] as const,
  anamnesis: (patientId: string) => [...medicalRecordKeys.all, 'anamnesis', patientId] as const,
  examinations: (patientId: string) => [...medicalRecordKeys.all, 'examinations', patientId] as const,
  treatmentPlans: (patientId: string) => [...medicalRecordKeys.all, 'treatment-plans', patientId] as const,
  attachments: (patientId: string) => [...medicalRecordKeys.all, 'attachments', patientId] as const,
  history: (patientId: string) => [...medicalRecordKeys.all, 'history', patientId] as const,
  summary: (patientId: string) => [...medicalRecordKeys.all, 'summary', patientId] as const,
} as const;

// ===== ANAMNESIS HOOKS =====

/**
 * Hook to fetch anamnesis records for a patient
 */
export function useAnamnesisRecords(patientId: string) {
  return useQuery({
    queryKey: medicalRecordKeys.anamnesis(patientId),
    queryFn: () => medicalRecordService.getAnamnesisRecords(patientId),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch the latest anamnesis for a patient
 */
export function useLatestAnamnesis(patientId: string) {
  return useQuery({
    queryKey: [...medicalRecordKeys.anamnesis(patientId), 'latest'],
    queryFn: () => medicalRecordService.getLatestAnamnesis(patientId),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to save anamnesis record
 */
export function useSaveAnamnesis() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ patientId, data }: { patientId: string; data: Partial<AnamnesisRecord> }) => {
      if (!user) throw new MedicalRecordError('Usuário não autenticado', 'UNAUTHORIZED');

      const fullName = user.displayName || user.email?.split('@')[0];
      const profileId = await ensureProfile(user.uid, user.email, fullName);
      if (!profileId) throw new MedicalRecordError('Não foi possível carregar o perfil', 'PROFILE_ERROR');

      return medicalRecordService.saveAnamnesis(patientId, data, profileId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: medicalRecordKeys.anamnesis(variables.patientId) });
      toast({
        title: 'Anamnese salva',
        description: 'A anamnese foi salva com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar anamnese',
        description: error instanceof MedicalRecordError ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete anamnesis record
 */
export function useDeleteAnamnesis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ recordId, patientId }: { recordId: string; patientId: string }) => {
      await medicalRecordService.deleteAnamnesis(recordId);
      return { recordId, patientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: medicalRecordKeys.anamnesis(data.patientId) });
      toast({
        title: 'Anamnese excluída',
        description: 'A anamnese foi excluída com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir anamnese',
        description: error instanceof MedicalRecordError ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

// ===== PHYSICAL EXAMINATION HOOKS =====

/**
 * Hook to fetch physical examination records for a patient
 */
export function usePhysicalExaminations(patientId: string) {
  return useQuery({
    queryKey: medicalRecordKeys.examinations(patientId),
    queryFn: () => medicalRecordService.getPhysicalExaminations(patientId),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to save physical examination record
 */
export function useSavePhysicalExamination() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ patientId, data }: { patientId: string; data: Partial<PhysicalExamination> }) => {
      if (!user) throw new MedicalRecordError('Usuário não autenticado', 'UNAUTHORIZED');

      const fullName = user.displayName || user.email?.split('@')[0];
      const profileId = await ensureProfile(user.uid, user.email, fullName);
      if (!profileId) throw new MedicalRecordError('Não foi possível carregar o perfil', 'PROFILE_ERROR');

      return medicalRecordService.savePhysicalExamination(patientId, data, profileId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: medicalRecordKeys.examinations(variables.patientId) });
      toast({
        title: 'Exame físico salvo',
        description: 'O exame físico foi salvo com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar exame físico',
        description: error instanceof MedicalRecordError ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

// ===== TREATMENT PLAN HOOKS =====

/**
 * Hook to fetch treatment plans for a patient
 */
export function useTreatmentPlans(patientId: string) {
  return useQuery({
    queryKey: medicalRecordKeys.treatmentPlans(patientId),
    queryFn: () => medicalRecordService.getTreatmentPlans(patientId),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch the active treatment plan for a patient
 */
export function useActiveTreatmentPlan(patientId: string) {
  return useQuery({
    queryKey: [...medicalRecordKeys.treatmentPlans(patientId), 'active'],
    queryFn: () => medicalRecordService.getActiveTreatmentPlan(patientId),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to save treatment plan
 */
export function useSaveTreatmentPlan() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ patientId, data }: { patientId: string; data: Partial<TreatmentPlan> }) => {
      if (!user) throw new MedicalRecordError('Usuário não autenticado', 'UNAUTHORIZED');

      const fullName = user.displayName || user.email?.split('@')[0];
      const profileId = await ensureProfile(user.uid, user.email, fullName);
      if (!profileId) throw new MedicalRecordError('Não foi possível carregar o perfil', 'PROFILE_ERROR');

      return medicalRecordService.saveTreatmentPlan(patientId, data, profileId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: medicalRecordKeys.treatmentPlans(variables.patientId) });
      toast({
        title: 'Plano de tratamento salvo',
        description: 'O plano de tratamento foi salvo com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar plano de tratamento',
        description: error instanceof MedicalRecordError ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update treatment plan
 */
export function useUpdateTreatmentPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ planId, data }: { planId: string; data: Partial<TreatmentPlan> }) => {
      return medicalRecordService.updateTreatmentPlan(planId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicalRecordKeys.treatmentPlans('') });
      toast({
        title: 'Plano de tratamento atualizado',
        description: 'O plano de tratamento foi atualizado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar plano de tratamento',
        description: error instanceof MedicalRecordError ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

// ===== ATTACHMENT HOOKS =====

/**
 * Hook to fetch attachments for a patient
 */
export function usePatientAttachments(patientId: string) {
  return useQuery({
    queryKey: medicalRecordKeys.attachments(patientId),
    queryFn: () => medicalRecordService.getPatientAttachments(patientId),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 2, // 2 minutes - attachments may change more frequently
  });
}

/**
 * Hook to delete an attachment
 */
export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ attachmentId, patientId }: { attachmentId: string; patientId: string }) => {
      await medicalRecordService.deleteAttachment(attachmentId);
      return { attachmentId, patientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: medicalRecordKeys.attachments(data.patientId) });
      toast({
        title: 'Anexo excluído',
        description: 'O anexo foi excluído com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir anexo',
        description: error instanceof MedicalRecordError ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

// ===== CONSULTATION HISTORY HOOK =====

/**
 * Hook to fetch consultation history for a patient
 */
export function useConsultationHistory(patientId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [...medicalRecordKeys.history(patientId), startDate, endDate],
    queryFn: () => medicalRecordService.getConsultationHistory(patientId, startDate, endDate),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5,
  });
}

// ===== MEDICAL RECORD SUMMARY & EXPORT =====

/**
 * Hook to generate medical record summary for PDF export
 */
export function useMedicalRecordSummary(patientId: string, patientData: {
  name: string;
  birthDate?: string;
  cpf?: string;
  phone?: string;
  email?: string;
}) {
  return useQuery({
    queryKey: medicalRecordKeys.summary(patientId),
    queryFn: () => medicalRecordService.generateMedicalRecordSummary(patientId, patientData),
    enabled: !!patientId && !!patientData.name,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to export medical record as HTML/PDF
 */
export function useExportMedicalRecord() {
  const { toast } = useToast();

  const exportAsHTML = async (patientId: string, patientData: {
    name: string;
    birthDate?: string;
    cpf?: string;
    phone?: string;
    email?: string;
  }) => {
    try {
      const summary = await medicalRecordService.generateMedicalRecordSummary(patientId, patientData);
      const html = medicalRecordService.formatMedicalRecordAsHTML(summary);

      // Create a blob and download
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prontuario-${patientData.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Prontuário exportado',
        description: 'O prontuário foi exportado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao exportar prontuário',
        description: error instanceof MedicalRecordError ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const exportAsPrint = async (patientId: string, patientData: {
    name: string;
    birthDate?: string;
    cpf?: string;
    phone?: string;
    email?: string;
  }) => {
    try {
      const summary = await medicalRecordService.generateMedicalRecordSummary(patientId, patientData);
      const html = medicalRecordService.formatMedicalRecordAsHTML(summary);

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      toast({
        title: 'Prontuário aberto para impressão',
        description: 'Selecione "Salvar como PDF" na janela de impressão.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao abrir prontuário',
        description: error instanceof MedicalRecordError ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  return { exportAsHTML, exportAsPrint };
}
