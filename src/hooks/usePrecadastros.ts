/**
 * usePrecadastros - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc, query as firestoreQuery, where, orderBy, db } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeFirestoreData } from '@/utils/firestoreData';

export interface PrecadastroToken {
  id: string;
  organization_id: string;
  nome: string;
  descricao: string | null;
  token: string;
  ativo: boolean;
  max_usos: number | null;
  usos_atuais: number;
  expires_at: string | null;
  campos_obrigatorios: string[];
  campos_opcionais: string[];
  created_at: string;
}

export interface Precadastro {
  id: string;
  token_id: string;
  organization_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  observacoes: string | null;
  status: string;
  converted_at: string | null;
  patient_id: string | null;
  dados_adicionais: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  token_nome?: string; // Joined field
}

export function usePrecadastroTokens() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['precadastro-tokens'],
    queryFn: async () => {
      if (!user) return [];

      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      const profileData = profileDoc.exists() ? profileDoc.data() : null;

      if (!profileData?.organization_id) return [];

      const q = firestoreQuery(
        collection(db, 'precadastro_tokens'),
        where('organization_id', '==', profileData.organization_id),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as PrecadastroToken[];
    },
    enabled: !!user
  });
}

export function usePrecadastros() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['precadastros'],
    queryFn: async () => {
      if (!user) return [];

      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      const profileData = profileDoc.exists() ? profileDoc.data() : null;

      if (!profileData?.organization_id) return [];

      const q = firestoreQuery(
        collection(db, 'precadastros'),
        where('organization_id', '==', profileData.organization_id),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      const precadastros = snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));

      // Fetch token names for each precadastro
      const tokenIds = precadastros.map((p: Precadastro) => p.token_id).filter((id): id is string => id !== null);
      const tokenMap = new Map<string, string>();

      await Promise.all([...new Set(tokenIds)].map(async (tokenId) => {
        const tokenDoc = await getDoc(doc(db, 'precadastro_tokens', tokenId));
        if (tokenDoc.exists()) {
          tokenMap.set(tokenId, tokenDoc.data().nome as string);
        }
      }));

      // Attach token names
      return precadastros.map((p: Precadastro) => ({
        ...p,
        token_nome: tokenMap.get(p.token_id),
      })) as Precadastro[];
    },
    enabled: !!user
  });
}

export function useCreatePrecadastroToken() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<PrecadastroToken>) => {
      if (!user) throw new Error('Usuário não autenticado');

      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      const profileData = profileDoc.exists() ? profileDoc.data() : null;

      if (!profileData?.organization_id) throw new Error('Organização não encontrada');

      // Generate unique token
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

      const tokenData = {
        ...data,
        organization_id: profileData.organization_id,
        token,
        usos_atuais: 0,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'precadastro_tokens'), tokenData);
      const docSnap = await getDoc(docRef);

      return { id: docRef.id, ...docSnap.data() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastro-tokens'] });
      toast.success('Link de pré-cadastro criado!');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao criar link: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  });
}

export function useUpdatePrecadastroToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PrecadastroToken> & { id: string }) => {
      const docRef = doc(db, 'precadastro_tokens', id);
      await updateDoc(docRef, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastro-tokens'] });
      toast.success('Link atualizado!');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao atualizar: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  });
}

export function useUpdatePrecadastro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Precadastro> & { id: string }) => {
      const docRef = doc(db, 'precadastros', id);
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };
      await updateDoc(docRef, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastros'] });
      toast.success('Pré-cadastro atualizado!');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao atualizar: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  });
}