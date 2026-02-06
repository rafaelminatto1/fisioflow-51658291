import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, getDocs, orderBy, query as firestoreQuery, updateDoc, doc, deleteDoc, getDoc } from '@/integrations/firebase/app';
import { useToast } from '@/hooks/use-toast';
import { ContratadoCreate, ContratadoUpdate } from '@/lib/validations/contratado';
import { db } from '@/integrations/firebase/app';

export interface Contratado {
  id: string;
  nome: string;
  contato?: string | null;
  cpf_cnpj?: string | null;
  especialidade?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
}

const convertDoc = <T>(docSnap: { id: string; data: () => Record<string, unknown> }): T =>
  ({ id: docSnap.id, ...docSnap.data() } as T);

export function useContratados() {
  return useQuery({
    queryKey: ['contratados'],
    queryFn: async () => {
      const q = firestoreQuery(collection(db, 'contratados'), orderBy('nome', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc<Contratado>);
    },
  });
}

export function useCreateContratado() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contratado: ContratadoCreate) => {
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'contratados'), {
        ...contratado,
        created_at: now,
        updated_at: now,
      });
      const snapshot = await getDoc(docRef);
      return convertDoc<Contratado>(snapshot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratados'] });
      toast({
        title: 'Contratado criado!',
        description: 'Contratado cadastrado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao criar contratado',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateContratado() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ContratadoUpdate }) => {
      const docRef = doc(db, 'contratados', id);
      await updateDoc(docRef, { ...data, updated_at: new Date().toISOString() });
      const snapshot = await getDoc(docRef);
      return convertDoc<Contratado>(snapshot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratados'] });
      toast({
        title: 'Contratado atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar contratado',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteContratado() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'contratados', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratados'] });
      toast({
        title: 'Contratado removido!',
        description: 'Contratado excluído com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover contratado',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}
