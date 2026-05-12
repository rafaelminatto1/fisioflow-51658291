import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listPatientPhotos,
  listPatientVideos,
  listMedicalRequests,
  createPatientPhoto,
  createPatientVideo,
  createMedicalRequest,
  updateMedicalRequest,
  deletePatientPhoto,
  deletePatientVideo,
  deleteMedicalRequest,
  uploadPatientFile,
  getPatientMediaAccessUrl,
  type PatientPhoto,
  type PatientVideo,
  type MedicalRequest,
} from "@/api/v2/patientMedia";

// ─── Fotos ────────────────────────────────────────────────────────────────────

export function usePatientPhotos(patientId: string, filters?: { photo_type?: string }) {
  return useQuery({
    queryKey: ["patient-photos", patientId, filters],
    queryFn: () => listPatientPhotos(patientId, filters),
    enabled: !!patientId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUploadPatientPhoto(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      photoType,
      metadata,
    }: {
      file: File;
      photoType: PatientPhoto["photo_type"];
      metadata?: Partial<PatientPhoto>;
    }) => {
      const { r2Key } = await uploadPatientFile({
        patientId,
        mediaType: "photo",
        file,
      });
      return createPatientPhoto(patientId, {
        r2_key: r2Key,
        photo_type: photoType,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        ...metadata,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-photos", patientId] });
      toast.success("Foto salva com sucesso");
    },
    onError: () => toast.error("Falha ao salvar foto"),
  });
}

export function useDeletePatientPhoto(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => deletePatientPhoto(patientId, photoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-photos", patientId] });
      toast.success("Foto removida");
    },
    onError: () => toast.error("Falha ao remover foto"),
  });
}

// ─── Vídeos ───────────────────────────────────────────────────────────────────

export function usePatientVideos(patientId: string, filters?: { video_type?: string }) {
  return useQuery({
    queryKey: ["patient-videos", patientId, filters],
    queryFn: () => listPatientVideos(patientId, filters),
    enabled: !!patientId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUploadPatientVideo(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      videoType,
      durationSeconds,
      metadata,
    }: {
      file: File;
      videoType: PatientVideo["video_type"];
      durationSeconds?: number;
      metadata?: Partial<PatientVideo>;
    }) => {
      const { r2Key } = await uploadPatientFile({
        patientId,
        mediaType: "video",
        file,
      });
      return createPatientVideo(patientId, {
        r2_key: r2Key,
        video_type: videoType,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        duration_seconds: durationSeconds,
        ...metadata,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-videos", patientId] });
      toast.success("Vídeo salvo com sucesso");
    },
    onError: () => toast.error("Falha ao salvar vídeo"),
  });
}

export function useDeletePatientVideo(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) => deletePatientVideo(patientId, videoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-videos", patientId] });
      toast.success("Vídeo removido");
    },
    onError: () => toast.error("Falha ao remover vídeo"),
  });
}

// ─── Pedidos médicos ──────────────────────────────────────────────────────────

export function useMedicalRequests(patientId: string) {
  return useQuery({
    queryKey: ["medical-requests", patientId],
    queryFn: () => listMedicalRequests(patientId),
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMedicalRequest(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      data,
      file,
    }: {
      data: Partial<MedicalRequest>;
      file?: File;
    }) => {
      let r2Key: string | undefined;
      if (file) {
        const uploaded = await uploadPatientFile({
          patientId,
          mediaType: "medical_request",
          file,
        });
        r2Key = uploaded.r2Key;
      }
      return createMedicalRequest(patientId, {
        ...data,
        ...(r2Key ? { r2_key: r2Key, file_name: file?.name, file_size: file?.size, mime_type: file?.type } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medical-requests", patientId] });
      toast.success("Pedido registrado");
    },
    onError: () => toast.error("Falha ao registrar pedido"),
  });
}

export function useUpdateMedicalRequest(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MedicalRequest> }) =>
      updateMedicalRequest(patientId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medical-requests", patientId] });
      toast.success("Pedido atualizado");
    },
  });
}

export function useDeleteMedicalRequest(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMedicalRequest(patientId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medical-requests", patientId] });
      toast.success("Pedido removido");
    },
  });
}

// ─── Access URL (lazy load de presigned GET) ──────────────────────────────────

export function useMediaAccessUrl(r2Key: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["media-access-url", r2Key],
    queryFn: () => getPatientMediaAccessUrl(r2Key!),
    enabled: !!r2Key && enabled,
    staleTime: 10 * 60 * 1000, // 10min (URL válida por 15min)
    gcTime: 12 * 60 * 1000,
  });
}
