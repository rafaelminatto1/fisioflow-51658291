/**
 * usePatientDocuments — Neon via Workers API
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/r2-storage";
import { documentsApi, type PatientDocument } from "@/api/v2";

export type { PatientDocument };

export interface UploadDocumentData {
  patient_id: string;
  file: File;
  category: "laudo" | "exame" | "receita" | "termo" | "outro";
  description?: string;
  extracted_text?: string;
  ai_summary?: string;
}

export const usePatientDocuments = (patientId: string) => {
  return useQuery({
    queryKey: ["patient-documents", patientId],
    queryFn: async () => {
      const res = await documentsApi.list(patientId);
      return res.data;
    },
    enabled: !!patientId,
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      patient_id,
      file,
      category,
      description,
      extracted_text,
      ai_summary,
    }: UploadDocumentData) => {
      const { publicUrl, key } = await uploadToR2(file, "patient-documents");
      const res = await documentsApi.create({
        patient_id,
        file_name: file.name,
        file_path: key,
        file_type: file.type,
        file_size: file.size,
        category,
        description,
        storage_url: publicUrl,
        extracted_text,
        ai_summary,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["patient-documents", data.patient_id],
      });
      toast({
        title: "Documento enviado",
        description: "Documento anexado com sucesso ao prontuário.",
      });
    },
    onError: (error: Error | unknown) => {
      toast({
        title: "Erro ao enviar documento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (document: PatientDocument) => {
      const res = await documentsApi.delete(document.id);
      if (res.file_path) {
        try {
          await deleteFromR2(res.file_path);
        } catch {
          /* ignore storage errors */
        }
      }
      return document;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["patient-documents", data.patient_id],
      });
      toast({
        title: "Documento removido",
        description: "Documento removido do prontuário.",
      });
    },
    onError: (error: Error | unknown) => {
      toast({
        title: "Erro ao remover documento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
};

export const useDownloadDocument = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (document: PatientDocument) => {
      const url =
        (document as any).storage_url || `https://media.moocafisio.com.br/${document.file_path}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Falha ao baixar arquivo");
      const blob = await response.blob();
      return { blob, document };
    },
    onSuccess: ({ blob, document: doc }) => {
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = doc.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    onError: (error: Error | unknown) => {
      toast({
        title: "Erro ao baixar documento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
};
