import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";

interface ClinicalIndexStatus {
  /** Quantidade de evoluções indexadas na organização. */
  indexed: number;
  /** Se há índice suficiente para busca semântica valer a pena. */
  available: boolean;
}

/**
 * Estado do índice semântico clínico (`clinical_embeddings`).
 *
 * Why: enquanto o índice estiver vazio, toda busca vetorial devolve lista vazia.
 * Consultar o status uma vez por sessão evita disparar essas buscas em cada
 * abertura de perfil. O status é global da organização, então uma query só
 * serve todos os widgets.
 */
export function useClinicalIndexStatus() {
  return useQuery({
    queryKey: ["clinical-index-status"],
    queryFn: async () => {
      const res = await request<{ data: ClinicalIndexStatus }>("/api/ai-clinical-search/status");
      return res.data;
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
  });
}
