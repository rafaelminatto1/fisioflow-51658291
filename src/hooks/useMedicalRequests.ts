/**
 * useMedicalRequests — Neon via Workers API
 */
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/r2-storage";
import { medicalRequestsApi, type MedicalRequest, type MedicalRequestFile } from "@/api/v2";
import { useAuth } from "@/contexts/AuthContext";

export type { MedicalRequest, MedicalRequestFile };

export const useMedicalRequests = (patientId?: string | null) => {
  const [requests, setRequests] = useState<MedicalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useAuth();

  const fetchRequests = useCallback(async () => {
    if (!patientId || !profile?.organization_id) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await medicalRequestsApi.list(patientId);
      setRequests(res.data);
    } catch (e) {
      console.error("useMedicalRequests fetch error", e);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, profile?.organization_id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const addRequest = async (
    data: { doctorName: string; date: Date; notes: string },
    files: File[],
  ) => {
    if (!patientId) return false;
    try {
      const res = await medicalRequestsApi.create({
        patient_id: patientId,
        doctor_name: data.doctorName,
        request_date: data.date.toISOString(),
        notes: data.notes,
      });
      const requestId = res.data.id;

      if (files.length > 0) {
        await Promise.all(
          files.map(async (file) => {
            const { publicUrl, key } = await uploadToR2(file, "medical-requests");
            await medicalRequestsApi.addFile(requestId, {
              file_path: key,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              storage_url: publicUrl,
            });
          }),
        );
      }

      toast.success("Pedido médico salvo com sucesso");
      fetchRequests();
      return true;
    } catch (error) {
      console.error("Error adding medical request", error);
      toast.error("Erro ao salvar pedido médico");
      return false;
    }
  };

  const deleteRequest = async (requestId: string) => {
    try {
      const res = await medicalRequestsApi.delete(requestId);
      if (res.deleted_files?.length) {
        await Promise.all(res.deleted_files.map((fp) => deleteFromR2(fp).catch(() => {})));
      }
      toast.success("Pedido removido");
      fetchRequests();
    } catch (error) {
      console.error("Error deleting medical request", error);
      toast.error("Erro ao remover pedido");
    }
  };

  return { requests, isLoading, addRequest, deleteRequest };
};
