/**
 * useEventos - Migrated to Firebase
 *
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy } from '@/integrations/firebase/app';
import { useToast } from '@/hooks/use-toast';
import { EventoCreate, EventoUpdate } from '@/lib/validations/evento';
import { mockEventos } from '@/lib/mockData';
import { db } from '@/integrations/firebase/app';



export interface Evento {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  local?: string;
  data_inicio: string;
  data_fim: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  gratuito: boolean;
  link_whatsapp?: string;
  valor_padrao_prestador?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper: Convert Firestore doc to Evento
const convertDocToEvento = (doc: { id: string; data: () => Record<string, unknown> }): Evento => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as Evento;
};

export function useEventos(filtros?: { status?: string; categoria?: string; busca?: string }) {
  return useQuery({
    queryKey: ['eventos', filtros],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'eventos'),
        orderBy('data_inicio', 'desc')
      );

      const snapshot = await getDocs(q);
      let eventos = snapshot.docs.map(convertDocToEvento);

      // Apply filters client-side (for simplicity)
      if (filtros?.status && filtros.status !== 'todos') {
        eventos = eventos.filter(e => e.status === filtros.status);
      }

      if (filtros?.categoria && filtros.categoria !== 'todos') {
        eventos = eventos.filter(e => e.categoria === filtros.categoria);
      }

      if (filtros?.busca) {
        const busca = filtros.busca.toLowerCase();
        eventos = eventos.filter(e =>
          e.nome.toLowerCase().includes(busca) ||
          (e.local && e.local.toLowerCase().includes(busca))
        );
      }

      return eventos;
    },
  });
}

export function useEvento(id: string) {
  return useQuery({
    queryKey: ['evento', id],
    queryFn: async () => {
      const docRef = doc(db, 'eventos', id);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        throw new Error('Evento não encontrado');
      }

      return convertDocToEvento(snapshot);
    },
    enabled: !!id,
  });
}

export function useCreateEvento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (evento: EventoCreate) => {
      // Converter datas para string no formato ISO
      const eventoData = {
        nome: evento.nome,
        descricao: evento.descricao || null,
        categoria: evento.categoria,
        local: evento.local || null,
        data_inicio: evento.data_inicio.toISOString().split('T')[0],
        data_fim: evento.data_fim.toISOString().split('T')[0],
        hora_inicio: evento.hora_inicio || null,
        hora_fim: evento.hora_fim || null,
        gratuito: evento.gratuito,
        link_whatsapp: evento.link_whatsapp || null,
        valor_padrao_prestador: evento.valor_padrao_prestador || null,
        status: 'AGENDADO',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'eventos'), eventoData);

      return {
        id: docRef.id,
        ...eventoData,
      } as Evento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      toast({
        title: 'Evento criado!',
        description: 'Evento cadastrado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      const _errorMessage = error instanceof Error ? error.message : 'Erro ao criar evento';
      toast({
        title: 'Erro ao criar evento',
        description: _errorMessage,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEvento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EventoUpdate }) => {
      const docRef = doc(db, 'eventos', id);

      // Converter datas se existirem
      const updateData: Record<string, string | Date | null | undefined> = { ...data };
      if (updateData.data_inicio instanceof Date) {
        updateData.data_inicio = updateData.data_inicio.toISOString().split('T')[0];
      }
      if (updateData.data_fim instanceof Date) {
        updateData.data_fim = updateData.data_fim.toISOString().split('T')[0];
      }
      updateData.updated_at = new Date().toISOString();

      await updateDoc(docRef, updateData);

      // Fetch updated document
      const snapshot = await getDoc(docRef);
      return convertDocToEvento(snapshot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      toast({
        title: 'Evento atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar evento',
        description: error instanceof Error ? error.message : 'Erro ao atualizar evento',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEvento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'eventos', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      toast({
        title: 'Evento excluído!',
        description: 'Evento removido com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao excluir evento',
        description: error instanceof Error ? error.message : 'Erro ao excluir evento',
        variant: 'destructive',
      });
    },
  });
}
