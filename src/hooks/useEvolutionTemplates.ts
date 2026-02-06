/**
 * useEvolutionTemplates - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc, query as firestoreQuery, where, orderBy, db } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { normalizeFirestoreData } from '@/utils/firestoreData';

export interface EvolutionTemplate {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  conteudo: string;
  campos_padrao: unknown[];
  ativo: boolean;
  organization_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EvolutionTemplateFormData = Omit<EvolutionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'organization_id'>;

// Helper to convert Firestore doc to EvolutionTemplate
const convertDocToEvolutionTemplate = (doc: { id: string; data: () => Record<string, unknown> }): EvolutionTemplate => {
  const data = normalizeFirestoreData(doc.data());
  return {
    id: doc.id,
    ...data,
  } as EvolutionTemplate;
};

export function useEvolutionTemplates(tipo?: string) {
  return useQuery({
    queryKey: ['evolution-templates', tipo],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'evolution_templates'),
        where('ativo', '==', true),
        orderBy('nome')
      );

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(convertDocToEvolutionTemplate);

      // Filter by tipo if provided
      if (tipo) {
        data = data.filter(t => t.tipo === tipo);
      }

      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutos - templates mudam pouco
    gcTime: 1000 * 60 * 30, // 30 minutos
  });
}

export function useCreateEvolutionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: EvolutionTemplateFormData) => {
      const templateData = {
        ...template,
        organization_id: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'evolution_templates'), templateData);
      const docSnap = await getDoc(docRef);

      return convertDocToEvolutionTemplate(docSnap);
    },
    // Optimistic update - adiciona template à lista antes da resposta do servidor
    onMutate: async (newTemplate) => {
      await queryClient.cancelQueries({ queryKey: ['evolution-templates'] });

      const previousTemplates = queryClient.getQueryData<EvolutionTemplate[]>(['evolution-templates']);

      // Adicionar template otimista com ID temporário
      const optimisticTemplate: EvolutionTemplate = {
        ...newTemplate,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        organization_id: null,
      };

      queryClient.setQueryData<EvolutionTemplate[]>(['evolution-templates'], (old) => [
        ...(old || []),
        optimisticTemplate,
      ]);

      return { previousTemplates };
    },
    onError: (err, newTemplate, context) => {
      // Rollback para os dados anteriores
      queryClient.setQueryData(['evolution-templates'], context?.previousTemplates);
      toast.error('Erro ao criar template de evolução.');
    },
    onSuccess: (data) => {
      // Substituir template otimista pelo real (com ID do servidor)
      queryClient.setQueryData<EvolutionTemplate[]>(['evolution-templates'], (old) =>
        old?.map((t) => (t.id.startsWith('temp-') ? data : t)) || [data]
      );
      toast.success('Template de evolução criado com sucesso.');
    },
  });
}

export function useUpdateEvolutionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...template }: Partial<EvolutionTemplate> & { id: string }) => {
      const docRef = doc(db, 'evolution_templates', id);
      await updateDoc(docRef, {
        ...template,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToEvolutionTemplate(docSnap);
    },
    // Optimistic update - atualiza template na lista antes da resposta do servidor
    onMutate: async ({ id, ...template }) => {
      await queryClient.cancelQueries({ queryKey: ['evolution-templates'] });

      const previousTemplates = queryClient.getQueryData<EvolutionTemplate[]>(['evolution-templates']);

      queryClient.setQueryData<EvolutionTemplate[]>(['evolution-templates'], (old) =>
        old?.map((t) =>
          t.id === id
            ? { ...t, ...template, updated_at: new Date().toISOString() }
            : t
        ) || []
      );

      return { previousTemplates };
    },
    onError: (err, variables, context) => {
      // Rollback para os dados anteriores
      queryClient.setQueryData(['evolution-templates'], context?.previousTemplates);
      toast.error('Erro ao atualizar template de evolução.');
    },
    onSuccess: (_data) => {
      toast.success('Template de evolução atualizado com sucesso.');
    },
  });
}

export function useDeleteEvolutionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, 'evolution_templates', id);
      await updateDoc(docRef, { ativo: false });
    },
    // Optimistic update - remove template da lista visualmente
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['evolution-templates'] });

      const previousTemplates = queryClient.getQueryData<EvolutionTemplate[]>(['evolution-templates']);

      queryClient.setQueryData<EvolutionTemplate[]>(['evolution-templates'], (old) =>
        old?.filter((t) => t.id !== id) || []
      );

      return { previousTemplates };
    },
    onError: (err, id, context) => {
      // Rollback para os dados anteriores
      queryClient.setQueryData(['evolution-templates'], context?.previousTemplates);
      toast.error('Erro ao excluir template de evolução.');
    },
    onSuccess: () => {
      toast.success('Template de evolução excluído com sucesso.');
    },
  });
}