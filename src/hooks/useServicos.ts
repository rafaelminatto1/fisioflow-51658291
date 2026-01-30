/**
 * useServicos - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('servicos') → Firestore collection 'servicos'
 * - supabase.select() → getDocs()
 * - supabase.insert() → addDoc()
 * - supabase.update() → updateDoc()
 * - supabase.delete() → deleteDoc()
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { db } from '@/integrations/firebase/app';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  orderBy
} from 'firebase/firestore';


export interface Servico {
  id: string;
  organization_id: string | null;
  nome: string;
  descricao: string | null;
  duracao_padrao: number;
  tipo_cobranca: 'unitario' | 'mensal' | 'pacote';
  valor: number;
  centro_custo: string | null;
  permite_agendamento_online: boolean;
  cor: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type ServicoFormData = Omit<Servico, 'id' | 'created_at' | 'updated_at'>;

// Helper to convert Firestore doc to Servico
const convertDocToServico = (doc: { id: string; data: () => Record<string, unknown> }): Servico => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as Servico;
};

export function useServicos() {
  return useQuery({
    queryKey: ['servicos'],
    queryFn: async () => {
      const q = query(
        collection(db, 'servicos'),
        orderBy('nome')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToServico);
    },
    staleTime: 1000 * 60 * 15, // 15 minutos - serviços mudam pouco
    gcTime: 1000 * 60 * 30,
  });
}

export function useCreateServico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (servico: ServicoFormData) => {
      const servicoData = {
        ...servico,
        organization_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'servicos'), servicoData);
      const docSnap = await getDoc(docRef);

      return convertDocToServico(docSnap);
    },
    // Optimistic update - adiciona serviço antes da resposta do servidor
    onMutate: async (newServico) => {
      await queryClient.cancelQueries({ queryKey: ['servicos'] });

      const previousServicos = queryClient.getQueryData<Servico[]>(['servicos']);

      const optimisticServico: Servico = {
        ...newServico,
        id: `temp-${Date.now()}`,
        organization_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Servico[]>(['servicos'], (old) => {
        const newData = [...(old || []), optimisticServico];
        return newData.sort((a, b) => a.nome.localeCompare(b.nome));
      });

      return { previousServicos };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['servicos'], context?.previousServicos);
      toast({ title: 'Erro ao criar serviço', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Serviço criado com sucesso' });
    },
  });
}

export function useUpdateServico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Servico> & { id: string }) => {
      const docRef = doc(db, 'servicos', id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToServico(docSnap);
    },
    // Optimistic update - atualiza serviço antes da resposta do servidor
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['servicos'] });

      const previousServicos = queryClient.getQueryData<Servico[]>(['servicos']);

      queryClient.setQueryData<Servico[]>(['servicos'], (old) =>
        (old || []).map((s) =>
          s.id === id
            ? { ...s, ...updates, updated_at: new Date().toISOString() }
            : s
        )
      );

      return { previousServicos };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['servicos'], context?.previousServicos);
      toast({ title: 'Erro ao atualizar serviço', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Serviço atualizado com sucesso' });
    },
  });
}

export function useDeleteServico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'servicos', id));
    },
    // Optimistic update - remove serviço da lista visualmente
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['servicos'] });

      const previousServicos = queryClient.getQueryData<Servico[]>(['servicos']);

      queryClient.setQueryData<Servico[]>(['servicos'], (old) =>
        (old || []).filter((s) => s.id !== id)
      );

      return { previousServicos };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['servicos'], context?.previousServicos);
      toast({ title: 'Erro ao remover serviço', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Serviço removido com sucesso' });
    },
  });
}
