import { request } from "./base";

export type AiSearchSource = {
  id: string;
  filename?: string;
  content?: string;
  score?: number;
};

export type AskResponse = {
  answered: boolean;
  answer: string | null;
  sources: AiSearchSource[];
  topScore?: number;
};

export const aiSearchApi = {
  ask: (query: string) =>
    request<AskResponse>("/api/ai-search/ask", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
};
