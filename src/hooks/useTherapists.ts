/**
 * Hook para listar fisioterapeutas (via Workers API).
 * Retorna id, nome e CREFITO para uso em selects e exibição em evoluções/agenda.
 */

import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/api/v2";

export interface TherapistOption {
  id: string;
  name: string;
  crefito?: string;
}

/** Valor do Select quando nenhum fisioterapeuta está selecionado */
export const THERAPIST_SELECT_NONE = "__none__" as const;

/** Placeholder exibido no dropdown de fisioterapeuta */
export const THERAPIST_PLACEHOLDER = "Escolher fisioterapeuta";

const THERAPISTS_QUERY_KEY = ["therapists"] as const;

async function fetchTherapists(): Promise<TherapistOption[]> {
  try {
    const res = await profileApi.listTherapists();
    const list = (res?.data ?? []) as TherapistOption[];

    const mappedList = list.map((t) => ({
      id: String(t.id),
      name: String(t.name ?? "Sem nome").trim(),
      crefito: t.crefito ? String(t.crefito).trim() : undefined,
    }));

    // Sempre incluir o perfil padrão solicitado
    const hasDefault = mappedList.some(
      (t) => t.name.toLowerCase().includes("rafael minatto") || t.id === "default-rafael",
    );
    if (!hasDefault) {
      mappedList.push({
        id: "default-rafael",
        name: "Rafael Minatto",
        crefito: "000000-F", // Placeholder, o usuário não forneceu
      });
    }

    return mappedList.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  } catch (error) {
    console.error("Error fetching therapists, using default", error);
    return [
      {
        id: "default-rafael",
        name: "Rafael Minatto",
        crefito: "000000-F",
      },
    ];
  }
}

export function useTherapists() {
  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: THERAPISTS_QUERY_KEY,
    queryFn: fetchTherapists,
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
  return { therapists: data, isLoading, isError };
}

/** Formata label do fisioterapeuta para dropdown (nome + CREFITO se houver) */
export function formatTherapistLabel(t: TherapistOption): string {
  if (t.crefito) return `${t.name} (${t.crefito})`;
  return t.name;
}

/** Retorna o fisioterapeuta da lista pelo id, ou undefined */
export function getTherapistById(
  therapists: TherapistOption[],
  id: string,
): TherapistOption | undefined {
  return therapists.find((t) => t.id === id);
}
