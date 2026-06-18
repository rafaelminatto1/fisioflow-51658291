import { request } from "./base";

export const evolutionAiApi = {
  extractBlocks: (text: string) =>
    request<{ data: Array<Record<string, unknown>> }>("/api/evolution/extract-blocks", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  transcribeBlocks: (audioBase64: string) =>
    request<{ data: { transcript: string; blocks: Array<Record<string, unknown>> } }>("/api/evolution/transcribe-blocks", {
      method: "POST",
      body: JSON.stringify({ audioBase64 }),
    }),
};
