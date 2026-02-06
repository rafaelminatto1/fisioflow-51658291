/**
 * useDocumentTemplates - Migrated to Firebase
 */




// Atestado Templates

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query as firestoreQuery, orderBy, db } from '@/integrations/firebase/app';
import { toast } from '@/hooks/use-toast';
import { normalizeFirestoreData } from '@/utils/firestoreData';

export interface AtestadoTemplate {
  id: string;
  organization_id: string | null;
  nome: string;
  descricao: string | null;
  conteudo: string;
  variaveis_disponiveis: string[];
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AtestadoTemplateFormData = Partial<Pick<AtestadoTemplate, 'organization_id' | 'variaveis_disponiveis' | 'created_by'>> & Pick<AtestadoTemplate, 'nome' | 'descricao' | 'conteudo' | 'ativo'>;

// Contrato Templates
export interface ContratoTemplate {
  id: string;
  organization_id: string | null;
  nome: string;
  descricao: string | null;
  tipo: string;
  conteudo: string;
  variaveis_disponiveis: string[];
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ContratoTemplateFormData = Partial<Pick<ContratoTemplate, 'organization_id' | 'variaveis_disponiveis' | 'created_by'>> & Pick<ContratoTemplate, 'nome' | 'descricao' | 'conteudo' | 'tipo' | 'ativo'>;

// Helper to convert Firestore doc to AtestadoTemplate
const convertDocToAtestadoTemplate = (doc: { id: string; data: () => Record<string, unknown> }): AtestadoTemplate => {
  const data = normalizeFirestoreData(doc.data());
  return {
    id: doc.id,
    ...data,
  } as AtestadoTemplate;
};

// Helper to convert Firestore doc to ContratoTemplate
const convertDocToContratoTemplate = (doc: { id: string; data: () => Record<string, unknown> }): ContratoTemplate => {
  const data = normalizeFirestoreData(doc.data());
  return {
    id: doc.id,
    ...data,
  } as ContratoTemplate;
};

// Atestado Hooks
export function useAtestadoTemplates() {
  return useQuery({
    queryKey: ['atestado_templates'],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'atestado_templates'),
        orderBy('nome')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToAtestadoTemplate);
    },
  });
}

export function useCreateAtestadoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: AtestadoTemplateFormData) => {
      const templateData = {
        ...template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'atestado_templates'), templateData);
      const docSnap = await getDoc(docRef);

      return convertDocToAtestadoTemplate(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atestado_templates'] });
      toast({ title: 'Modelo de atestado criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar modelo', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateAtestadoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AtestadoTemplate> & { id: string }) => {
      const docRef = doc(db, 'atestado_templates', id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToAtestadoTemplate(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atestado_templates'] });
      toast({ title: 'Modelo de atestado atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar modelo', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteAtestadoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'atestado_templates', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atestado_templates'] });
      toast({ title: 'Modelo removido com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover modelo', description: error.message, variant: 'destructive' });
    },
  });
}

// Contrato Hooks
export function useContratoTemplates() {
  return useQuery({
    queryKey: ['contrato_templates'],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'contrato_templates'),
        orderBy('nome')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToContratoTemplate);
    },
  });
}

export function useCreateContratoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: ContratoTemplateFormData) => {
      const templateData = {
        ...template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'contrato_templates'), templateData);
      const docSnap = await getDoc(docRef);

      return convertDocToContratoTemplate(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contrato_templates'] });
      toast({ title: 'Modelo de contrato criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar modelo', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateContratoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContratoTemplate> & { id: string }) => {
      const docRef = doc(db, 'contrato_templates', id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToContratoTemplate(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contrato_templates'] });
      toast({ title: 'Modelo de contrato atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar modelo', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteContratoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'contrato_templates', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contrato_templates'] });
      toast({ title: 'Modelo removido com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover modelo', description: error.message, variant: 'destructive' });
    },
  });
}

// Template variables helper
export const templateVariables = {
  atestado: [
    { key: '#cliente-nome', label: 'Nome do Cliente' },
    { key: '#cliente-cpf', label: 'CPF do Cliente' },
    { key: '#data-hoje', label: 'Data de Hoje' },
    { key: '#hora-atual', label: 'Hora Atual' },
    { key: '#clinica-cidade', label: 'Cidade da Clínica' },
    { key: '#profissional-nome', label: 'Nome do Profissional' },
  ],
  contrato: [
    { key: '#cliente-nome', label: 'Nome do Cliente' },
    { key: '#cliente-cpf', label: 'CPF do Cliente' },
    { key: '#cliente-endereco', label: 'Endereço do Cliente' },
    { key: '#data-hoje', label: 'Data de Hoje' },
    { key: '#valor-total', label: 'Valor Total' },
    { key: '#servico-nome', label: 'Nome do Serviço' },
    { key: '#profissional-nome', label: 'Nome do Profissional' },
  ],
};