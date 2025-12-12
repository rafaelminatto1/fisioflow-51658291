import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Atestado Templates
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

// Atestado Hooks
export function useAtestadoTemplates() {
  return useQuery({
    queryKey: ['atestado_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atestado_templates')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as AtestadoTemplate[];
    },
  });
}

export function useCreateAtestadoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: AtestadoTemplateFormData) => {
      const { data, error } = await supabase
        .from('atestado_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('atestado_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('atestado_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('contrato_templates')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as ContratoTemplate[];
    },
  });
}

export function useCreateContratoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: ContratoTemplateFormData) => {
      const { data, error } = await supabase
        .from('contrato_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('contrato_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('contrato_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
