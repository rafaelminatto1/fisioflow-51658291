/**
 * useEventoTemplates - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('evento_templates') → Firestore collection 'evento_templates'
 * - supabase.from('eventos') → Firestore collection 'eventos'
 * - supabase.from('checklist_items') → Firestore collection 'checklist_items'
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where, orderBy } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';


export type EventoTemplate = {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  gratuito: boolean;
  valor_padrao_prestador: number;
  checklist_padrao?: string[];
  created_at?: string;
  updated_at?: string;
};

// Helper to convert Firestore doc to EventoTemplate
const convertDocToEventoTemplate = (doc: { id: string; data: () => Record<string, unknown> }): EventoTemplate => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as EventoTemplate;
};

export function useEventoTemplates() {
  return useQuery({
    queryKey: ['evento-templates'],
    queryFn: async () => {
      const q = query(
        collection(db, 'evento_templates'),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToEventoTemplate);
    },
  });
}

export function useCreateTemplateFromEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventoId, nome }: { eventoId: string; nome: string }) => {
      // Fetch evento with checklist items
      const eventoDoc = await getDoc(doc(db, 'eventos', eventoId));
      if (!eventoDoc.exists()) {
        throw new Error('Evento não encontrado');
      }

      const evento = { id: eventoDoc.id, ...eventoDoc.data() };

      // Fetch checklist items for this evento
      const checklistQ = query(
        collection(db, 'checklist_items'),
        where('evento_id', '==', eventoId)
      );
      const checklistSnapshot = await getDocs(checklistQ);
      const checklistItems = checklistSnapshot.docs.map(doc => doc.data());

      const templateData = {
        nome,
        descricao: evento.descricao,
        categoria: evento.categoria,
        gratuito: evento.gratuito,
        valor_padrao_prestador: evento.valor_padrao_prestador,
        checklist_padrao: checklistItems.map((item: Record<string, unknown>) => ({
          titulo: item.titulo,
          tipo: item.tipo,
          quantidade: item.quantidade,
          custo_unitario: item.custo_unitario,
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'evento_templates'), templateData);
      const docSnap = await getDoc(docRef);

      return convertDocToEventoTemplate(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evento-templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar template');
    },
  });
}

export function useCreateEventoFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      nomeEvento,
      dataInicio,
      dataFim,
      local,
    }: {
      templateId: string;
      nomeEvento: string;
      dataInicio: string;
      dataFim: string;
      local: string;
    }) => {
      // Fetch template
      const templateDoc = await getDoc(doc(db, 'evento_templates', templateId));
      if (!templateDoc.exists()) {
        throw new Error('Template não encontrado');
      }

      const template = { id: templateDoc.id, ...templateDoc.data() };

      // Create evento from template
      const eventoData = {
        nome: nomeEvento,
        descricao: template.descricao,
        categoria: template.categoria,
        local,
        data_inicio: dataInicio,
        data_fim: dataFim,
        gratuito: template.gratuito,
        valor_padrao_prestador: template.valor_padrao_prestador,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const eventoDocRef = await addDoc(collection(db, 'eventos'), eventoData);
      const eventoDocSnap = await getDoc(eventoDocRef);
      const evento = { id: eventoDocSnap.id, ...eventoDocSnap.data() };

      // Create checklist items if template has checklist_padrao
      if (template.checklist_padrao && Array.isArray(template.checklist_padrao)) {
        const checklistItems = template.checklist_padrao.map((item: Record<string, unknown>) => ({
          evento_id: evento.id,
          titulo: item.titulo,
          tipo: item.tipo,
          quantidade: typeof item.quantidade === 'number' ? item.quantidade : 1,
          custo_unitario: typeof item.custo_unitario === 'number' ? item.custo_unitario : 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        // Batch insert checklist items
        await Promise.all(
          checklistItems.map(item => addDoc(collection(db, 'checklist_items'), item))
        );
      }

      return evento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      toast.success('Evento criado a partir do template');
    },
    onError: () => {
      toast.error('Erro ao criar evento');
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      await deleteDoc(doc(db, 'evento_templates', templateId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evento-templates'] });
      toast.success('Template excluído');
    },
    onError: () => {
      toast.error('Erro ao excluir template');
    },
  });
}
