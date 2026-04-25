import type { JsonValue } from "@/types/common";
import { request } from "./base";

export interface BiomechanicsLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
}

export interface BiomechanicsAssessment {
  id: string;
  patientId: string;
  type: "static_posture" | "gait_analysis" | "running_analysis" | "functional_movement";
  mediaUrl: string;
  thumbnailUrl?: string;
  analysisData: {
    landmarks?: BiomechanicsLandmark[];
    angles?: Record<string, number>;
    metrics?: Record<string, JsonValue>;
  };
  observations?: string;
  conclusions?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const biomechanicsApi = {
  listByPatient: (patientId: string) =>
    request<{ data: BiomechanicsAssessment[] }>(`/api/biomechanics/patient/${patientId}`),

  create: (data: Partial<BiomechanicsAssessment>) =>
    request<{ data: BiomechanicsAssessment }>(`/api/biomechanics`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<BiomechanicsAssessment>) =>
    request<{ data: BiomechanicsAssessment }>(`/api/biomechanics/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getById: (id: string) => request<{ data: BiomechanicsAssessment }>(`/api/biomechanics/${id}`),
};
