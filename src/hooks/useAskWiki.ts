import { useCallback, useRef, useState } from "react";
import { getWorkersApiUrl } from "../lib/api/config";
import { apiClient } from "../lib/api/v2/client";

export interface AskWikiSource {
  id: string;
  title: string;
  slug: string;
  category: string;
  type: string;
  score: number;
}

export interface AskWikiResult {
  answered: boolean;
  answer: string | null;
  sources: AskWikiSource[];
  topScore: number;
}

export type AskWikiContentType = "wiki" | "protocols" | "exercises";

export function useAskWiki() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskWikiResult | null>(null);
  const requestSeq = useRef(0);

  const ask = useCallback(async (query: string, type?: AskWikiContentType) => {
    const API_BASE = getWorkersApiUrl();

    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await apiClient.post<AskWikiResult>(`${API_BASE}/api/ai-search/ask`, {
        query,
        ...(type ? { type } : {}),
      });
      if (seq === requestSeq.current) setResult(data);
      return data;
    } catch (err: any) {
      if (seq === requestSeq.current) {
        setError(err?.message || "Erro ao consultar a wiki");
      }
      return null;
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    requestSeq.current++;
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return { ask, reset, loading, error, result };
}
