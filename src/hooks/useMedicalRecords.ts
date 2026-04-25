import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patientsApi, type PatientMedicalRecord } from "@/api/v2";
import { useToast } from "@/hooks/use-toast";

export type MedicalRecord = PatientMedicalRecord;

export function useMedicalRecords(patientId?: string) {
  return useQuery({
    queryKey: ["medical-records", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const response = await patientsApi.medicalRecords(patientId);
      return response.data ?? [];
    },
    enabled: !!patientId,
  });
}

export function useCreateMedicalRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (record: Omit<MedicalRecord, "id" | "created_at" | "updated_at">) => {
      const response = await patientsApi.createMedicalRecord(record.patient_id, {
        chief_complaint: record.chief_complaint,
        medical_history: record.medical_history,
        current_medications: record.current_medications,
        allergies: record.allergies,
        previous_surgeries: record.previous_surgeries,
        family_history: record.family_history,
        lifestyle_habits: record.lifestyle_habits,
        record_date: record.record_date,
        created_by: record.created_by,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["medical-records"] });
      if (data?.patient_id) {
        queryClient.invalidateQueries({
          queryKey: ["medical-records", data.patient_id],
        });
      }
      toast({
        title: "Prontuário criado!",
        description: "Prontuário adicionado com sucesso.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro ao criar prontuário",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateMedicalRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      data,
      patientId,
    }: {
      id: string;
      data: Partial<MedicalRecord>;
      patientId: string;
    }) => {
      const response = await patientsApi.updateMedicalRecord(patientId, id, {
        chief_complaint: data.chief_complaint,
        medical_history: data.medical_history,
        current_medications: data.current_medications,
        allergies: data.allergies,
        previous_surgeries: data.previous_surgeries,
        family_history: data.family_history,
        lifestyle_habits: data.lifestyle_habits,
        record_date: data.record_date,
        created_by: data.created_by,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["medical-records"] });
      queryClient.invalidateQueries({
        queryKey: ["medical-records", data.patient_id],
      });
      toast({
        title: "Prontuário atualizado!",
        description: "Alterações salvas com sucesso.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro ao atualizar prontuário",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteMedicalRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      await patientsApi.deleteMedicalRecord(patientId, id);
      return patientId;
    },
    onSuccess: (patientId) => {
      queryClient.invalidateQueries({ queryKey: ["medical-records"] });
      queryClient.invalidateQueries({
        queryKey: ["medical-records", patientId],
      });
      toast({
        title: "Prontuário removido!",
        description: "Prontuário excluído com sucesso.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro ao remover prontuário",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}
