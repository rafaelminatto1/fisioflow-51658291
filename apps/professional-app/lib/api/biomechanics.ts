import { fetchApi } from "./client";

export interface BiomechanicsSignature {
  valid: boolean;
  signer: string;
  signedAt: string;
  integrityStatus: string;
  metadata?: {
    ip?: string;
    userAgent?: string;
    fingerprint?: string;
  };
}

export interface BiomechanicsAnalysisPayload {
  patientId: string;
  type: string;
  analysisData: Record<string, unknown>;
}

export const biomechanicsApi = {
  create: (payload: BiomechanicsAnalysisPayload) =>
    fetchApi<{ success: boolean; data: any }>("/api/biomechanics", {
      method: "POST",
      data: payload,
    }),

  signAssessment: (id: string) =>
    fetchApi<{ success: boolean; data: any }>(`/api/biomechanics/${encodeURIComponent(id)}/sign`, {
      method: "POST",
    }),

  verifySignature: (id: string) =>
    fetchApi<BiomechanicsSignature>(`/api/biomechanics/${encodeURIComponent(id)}/verify`, {
      method: "GET",
    }),
};
