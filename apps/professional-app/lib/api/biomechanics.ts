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
  mediaUrl?: string;
  thumbnailUrl?: string;
  observations?: string;
  conclusions?: string;
}

export interface BiomechanicsAssessment {
  id: string;
  patientId: string;
  organizationId: string;
  professionalId?: string | null;
  type: string;
  status?: string | null;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  analysisData?: Record<string, any> | null;
  observations?: string | null;
  conclusions?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BiomechanicsComparisonMetric {
  key: string;
  label: string;
  unit: string;
  fromValue: number | null;
  toValue: number;
  delta: number | null;
  direction: "improved" | "worse" | "stable" | "new";
  lowerIsBetter: boolean;
}

export interface BiomechanicsComparison {
  from: null | {
    id: string;
    date: string;
    label: string;
    type: string;
    mediaUrl?: string | null;
    thumbnailUrl?: string | null;
  };
  to: {
    id: string;
    date: string;
    label: string;
    type: string;
    mediaUrl?: string | null;
    thumbnailUrl?: string | null;
  };
  metrics: BiomechanicsComparisonMetric[];
  availableAssessments: Array<{
    id: string;
    label: string;
    date: string;
    type: string;
    status?: string | null;
  }>;
  history: Array<{
    assessmentId: string;
    date: string;
    label: string;
    type: string;
    metrics: Array<{
      key: string;
      label: string;
      unit: string;
      value: number;
      lowerIsBetter: boolean;
    }>;
  }>;
}

export interface BiomechanicsPdfResult {
  pdfUrl: string;
  pdfKey: string;
  pdfHash: string;
  generated: boolean;
  cached: boolean;
  generatedAt: string;
}

export const biomechanicsApi = {
  create: (payload: BiomechanicsAnalysisPayload) =>
    fetchApi<{ success: boolean; data: any }>("/api/biomechanics", {
      method: "POST",
      data: payload,
    }),

  listByPatient: (patientId: string) =>
    fetchApi<{ data: BiomechanicsAssessment[] }>(
      `/api/biomechanics/patient/${encodeURIComponent(patientId)}`,
      { method: "GET" },
    ),

  getById: (id: string) =>
    fetchApi<{ data: BiomechanicsAssessment }>(`/api/biomechanics/${encodeURIComponent(id)}`, {
      method: "GET",
    }),

  getComparison: (
    patientId: string,
    params?: { fromAssessmentId?: string; toAssessmentId?: string; type?: string },
  ) =>
    fetchApi<{ data: BiomechanicsComparison }>(
      `/api/biomechanics/patient/${encodeURIComponent(patientId)}/comparison`,
      {
        method: "GET",
        params,
      },
    ),

  createOrReusePdf: (
    id: string,
    payload?: { patientName?: string; comparisonAssessmentId?: string; force?: boolean },
  ) =>
    fetchApi<{ data: BiomechanicsPdfResult }>(`/api/biomechanics/${encodeURIComponent(id)}/pdf`, {
      method: "POST",
      data: payload ?? {},
      timeout: 45000,
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
