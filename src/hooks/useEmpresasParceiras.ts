/**
 * useEmpresasParceiras - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('empresas_parceiras') → Firestore collection 'empresas_parceiras'
 * - supabase.select() → getDocs()
 * - supabase.insert() → addDoc()
 * - supabase.update() → updateDoc()
 * - supabase.delete() → deleteDoc()
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query as firestoreQuery, orderBy } from '@/integrations/firebase/app';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/integrations/firebase/app';



export interface EmpresaParceira {
  id: string;
  nome: string;
  contato?: string;
  email?: string;
  telefone?: string;
  contrapartidas?: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Helper to convert Firestore doc to EmpresaParceira
const convertDocToEmpresaParceira = (doc: { id: string; data: () => Record<string, unknown> }): EmpresaParceira => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as EmpresaParceira;
};

export function useEmpresasParceiras() {
  return useQuery({
    queryKey: ['empresas-parceiras'],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'empresas_parceiras'),
        orderBy('nome')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToEmpresaParceira);
    },
  });
}

export function useCreateEmpresaParceira() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (empresa: Omit<EmpresaParceira, 'id' | 'created_at' | 'updated_at'>) => {
      const empresaData = {
        ...empresa,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'empresas_parceiras'), empresaData);
      const docSnap = await getDoc(docRef);

      return convertDocToEmpresaParceira(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas-parceiras'] });
      toast({
        title: 'Empresa parceira criada!',
        description: 'Empresa adicionada com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao criar empresa',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEmpresaParceira() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmpresaParceira> }) => {
      const docRef = doc(db, 'empresas_parceiras', id);
      await updateDoc(docRef, {
        ...data,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToEmpresaParceira(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas-parceiras'] });
      toast({
        title: 'Empresa atualizada!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar empresa',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEmpresaParceira() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'empresas_parceiras', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas-parceiras'] });
      toast({
        title: 'Empresa removida!',
        description: 'Empresa excluída com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover empresa',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}
