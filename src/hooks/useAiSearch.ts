import { useState } from "react";
import { apiClient } from "../lib/api/v2/client";

export interface AiSource {
  file_id: string;
  filename: string;
  score: number;
  attributes?: Record<string, any>;
  content: Array<{
    id: string;
    type: string;
    text: string;
  }>;
}

export interface AiSearchResult {
  object: string;
  search_query: string;
  response?: string;
  data: AiSource[];
}

export function useAiSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string): Promise<AiSearchResult | null> => {
    const API_BASE =
      import.meta.env.VITE_WORKERS_API_URL || "https://fisioflow-api.rafalegollas.workers.dev";

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.post<AiSearchResult>(`${API_BASE}/api/ai-search`, { query });
      return data;
    } catch (err: any) {
      console.error("AI Search Hook Error:", err);
      setError(err.message || "Erro inesperado ao realizar busca com IA");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    search,
    loading,
    error,
  };
}
