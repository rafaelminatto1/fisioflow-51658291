/**
 * useFornecedores - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('fornecedores') → Firestore collection 'fornecedores'
 * - supabase.select() → getDocs()
 * - supabase.insert() → addDoc()
 * - supabase.update() → updateDoc()
 * - supabase.delete() → deleteDoc()
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, orderBy } from '@/integrations/firebase/app';
import { toast } from '@/hooks/use-toast';
import { db } from '@/integrations/firebase/app';



export interface Fornecedor {
  id: string;
  organization_id: string | null;
  tipo_pessoa: 'pf' | 'pj';
  razao_social: string;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
  inscricao_estadual: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  categoria: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type FornecedorFormData = Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'>;

// Helper to convert Firestore doc to Fornecedor
const convertDocToFornecedor = (doc: { id: string; data: () => Record<string, unknown> }): Fornecedor => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as Fornecedor;
};

export function useFornecedores() {
  return useQuery({
    queryKey: ['fornecedores'],
    queryFn: async () => {
      const q = query(
        collection(db, 'fornecedores'),
        orderBy('razao_social')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToFornecedor);
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
    gcTime: 1000 * 60 * 20,
  });
}

export function useCreateFornecedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fornecedor: FornecedorFormData) => {
      const fornecedorData = {
        ...fornecedor,
        organization_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'fornecedores'), fornecedorData);
      const docSnap = await getDoc(docRef);

      return convertDocToFornecedor(docSnap);
    },
    // Optimistic update - adiciona fornecedor antes da resposta do servidor
    onMutate: async (newFornecedor) => {
      await queryClient.cancelQueries({ queryKey: ['fornecedores'] });

      const previousFornecedores = queryClient.getQueryData<Fornecedor[]>(['fornecedores']);

      const optimisticFornecedor: Fornecedor = {
        ...newFornecedor,
        id: `temp-${Date.now()}`,
        organization_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Fornecedor[]>(['fornecedores'], (old) => {
        const newData = [...(old || []), optimisticFornecedor];
        return newData.sort((a, b) => a.razao_social.localeCompare(b.razao_social));
      });

      return { previousFornecedores };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['fornecedores'], context?.previousFornecedores);
      toast({ title: 'Erro ao criar fornecedor', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Fornecedor criado com sucesso' });
    },
  });
}

export function useUpdateFornecedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Fornecedor> & { id: string }) => {
      const docRef = doc(db, 'fornecedores', id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToFornecedor(docSnap);
    },
    // Optimistic update - atualiza fornecedor antes da resposta do servidor
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['fornecedores'] });

      const previousFornecedores = queryClient.getQueryData<Fornecedor[]>(['fornecedores']);

      queryClient.setQueryData<Fornecedor[]>(['fornecedores'], (old) =>
        (old || []).map((f) =>
          f.id === id
            ? { ...f, ...updates, updated_at: new Date().toISOString() }
            : f
        )
      );

      return { previousFornecedores };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['fornecedores'], context?.previousFornecedores);
      toast({ title: 'Erro ao atualizar fornecedor', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Fornecedor atualizado com sucesso' });
    },
  });
}

export function useDeleteFornecedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'fornecedores', id));
    },
    // Optimistic update - remove fornecedor da lista visualmente
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['fornecedores'] });

      const previousFornecedores = queryClient.getQueryData<Fornecedor[]>(['fornecedores']);

      queryClient.setQueryData<Fornecedor[]>(['fornecedores'], (old) =>
        (old || []).filter((f) => f.id !== id)
      );

      return { previousFornecedores };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['fornecedores'], context?.previousFornecedores);
      toast({ title: 'Erro ao remover fornecedor', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Fornecedor removido com sucesso' });
    },
  });
}
