import { request } from "./base";

export interface ScribeProcessResponse {
  success: boolean;
  rawText: string;
  formattedText: string;
}

export const iaStudioApi = {
  processScribeAudio: (patientId: string, section: string, audioBase64: string) =>
    request<ScribeProcessResponse>("/api/ia-studio/scribe/process", {
      method: "POST",
      body: JSON.stringify({ patientId, section, audioBase64 }),
    }),
};
