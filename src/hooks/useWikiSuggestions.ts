import { useEffect, useRef, useState } from "react";
import { apiClient } from "../lib/api/v2/client";
import type { AskWikiSource } from "./useAskWiki";

const API_BASE =
  import.meta.env.VITE_WORKERS_API_URL || "https://fisioflow-api.rafalegollas.workers.dev";

const DEBOUNCE_MS = 900;

/**
 * Sugestões da wiki relacionadas ao texto sendo digitado.
 * Debounced + cancelável: nunca bloqueia a digitação.
 */
export function useWikiSuggestions(text: string, enabled = true) {
  const [suggestions, setSuggestions] = useState<AskWikiSource[]>([]);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!enabled || text.trim().length < 12) {
      setSuggestions([]);
      return;
    }

    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.post<{ data: AskWikiSource[] }>(
          `${API_BASE}/api/ai-search/suggest`,
          { text },
        );
        if (seq === requestSeq.current) setSuggestions(res.data ?? []);
      } catch {
        if (seq === requestSeq.current) setSuggestions([]);
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [text, enabled]);

  return { suggestions, loading };
}
