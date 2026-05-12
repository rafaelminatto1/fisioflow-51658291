import { request } from "./base";

export interface ScribeProcessResponse {
  success: boolean;
  rawText: string;
  formattedText: string;
}

export interface AtRiskPatient {
  id: string;
  fullName: string;
  phone: string;
  status: string;
  lastSession: string;
  riskScore: number;
  reason: string;
}

export interface DischargePrediction {
  patientId: string;
  predictedTotal: number;
  currentSessions: number;
  remainingSessions: number;
  progressPercentage: number;
  confidence: number;
  factors: string[];
}

export const iaStudioApi = {
  processScribeAudio: (patientId: string, section: string, audioBase64: string) =>
    request<ScribeProcessResponse>("/api/ia-studio/scribe/process", {
      method: "POST",
      body: JSON.stringify({ patientId, section, audioBase64 }),
    }),

  getAtRiskPatients: () => request<{ data: AtRiskPatient[] }>("/api/ia-studio/retention/at-risk"),

  getDischargePrediction: (patientId: string) =>
    request<{ data: DischargePrediction }>(`/api/ia-studio/predict/discharge/${patientId}`),

  synthesizeReport: (patientId: string, highlights: string) =>
    request<{ success: boolean; data: { medico: string; paciente: string } }>(
      "/api/ia-studio/reports/synthesize",
      {
        method: "POST",
        body: JSON.stringify({ patientId, highlights }),
      },
    ),

  generateProtocol: (condition: string, sessionCount: number = 10) =>
    request<{
      success: boolean;
      data: {
        title: string;
        objective: string;
        phases: Array<{
          name: string;
          description: string;
          sessions: string;
          exercises: string[];
        }>;
      };
    }>("/api/ia-studio/generate-protocol", {
      method: "POST",
      body: JSON.stringify({ condition, sessionCount }),
    }),
};
