import { useState } from 'react';
import { useAuth } from './useAuth';
import { API_BASE_URL } from '../integrations/api/client';

interface AiSearchResult {
  object: string;
  search_query: string;
  response?: string;
  data: Array<{
    file_id: string;
    filename: string;
    score: number;
    attributes?: Record<string, any>;
    content: Array<{
      id: string;
      type: string;
      text: string;
    }>;
  }>;
}

export function useAiSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const search = async (query: string): Promise<AiSearchResult | null> => {
    if (!session?.access_token) {
      setError('Sessão inválida');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || `Erro ${response.status} na busca com IA`);
      }

      const data = await response.json() as AiSearchResult;
      return data;
    } catch (err: any) {
      console.error('AI Search Hook Error:', err);
      setError(err.message || 'Erro inesperado ao realizar busca com IA');
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
