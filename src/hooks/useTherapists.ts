/**
 * Hook para listar fisioterapeutas (profiles com role fisioterapeuta).
 * Retorna id, nome e CREFITO para uso em selects e exibição em evoluções/agenda.
 */

import { useQuery } from '@tanstack/react-query';

  collection,
  query as firestoreQuery,
  where,
  getDocs,
} from '@/integrations/firebase/app';
import { db } from '@/integrations/firebase/app';

export interface TherapistOption {
  id: string;
  name: string;
  crefito?: string;
}

/** Valor do Select quando nenhum fisioterapeuta está selecionado */
export const THERAPIST_SELECT_NONE = '__none__' as const;

/** Placeholder exibido no dropdown de fisioterapeuta */
export const THERAPIST_PLACEHOLDER = 'Escolher fisioterapeuta';

const THERAPISTS_QUERY_KEY = ['therapists'] as const;

async function fetchTherapists(): Promise<TherapistOption[]> {
  const q = firestoreQuery(
    collection(db, 'profiles'),
    where('role', '==', 'fisioterapeuta')
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: (data.full_name ?? data.name ?? 'Sem nome').trim(),
      crefito: data.crefito ? String(data.crefito).trim() : undefined,
    };
  });
  list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return list;
}

export function useTherapists() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: THERAPISTS_QUERY_KEY,
    queryFn: fetchTherapists,
    staleTime: 1000 * 60 * 5, // 5 minutos
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
  id: string
): TherapistOption | undefined {
  return therapists.find((t) => t.id === id);
}
