import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EvaluationFormField {
  id: string;
  form_id: string;
  grupo: string | null;
  ordem: number;
  label: string;
  tipo_campo: 'texto_curto' | 'texto_longo' | 'lista' | 'opcao_unica' | 'selecao';
  opcoes: string[] | null;
  obrigatorio: boolean;
  placeholder: string | null;
  created_at: string;
}

export interface EvaluationForm {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  ativo: boolean;
  organization_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  fields?: EvaluationFormField[];
}

export type EvaluationFormFormData = {
  nome: string;
  descricao?: string | null;
  tipo: string;
  ativo?: boolean;
};

export type EvaluationFormFieldFormData = Omit<EvaluationFormField, 'id' | 'created_at' | 'form_id'>;

export function useEvaluationForms(tipo?: string) {
  return useQuery({
    queryKey: ['evaluation-forms', tipo],
    queryFn: async () => {
      let query = supabase
        .from('evaluation_forms')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EvaluationForm[];
    },
  });
}

export function useEvaluationFormWithFields(formId: string | undefined) {
  return useQuery({
    queryKey: ['evaluation-form', formId],
    queryFn: async () => {
      if (!formId) return null;

      const { data: form, error: formError } = await supabase
        .from('evaluation_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError) throw formError;

      const { data: fields, error: fieldsError } = await supabase
        .from('evaluation_form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('ordem');

      if (fieldsError) throw fieldsError;

      return { ...form, fields } as EvaluationForm;
    },
    enabled: !!formId,
  });
}

export function useCreateEvaluationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: EvaluationFormFormData) => {
      const { data, error } = await supabase
        .from('evaluation_forms')
        .insert(form)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
      toast.success('Ficha de avaliação criada com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao criar ficha de avaliação.');
    },
  });
}

export function useUpdateEvaluationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...form }: Partial<EvaluationForm> & { id: string }) => {
      const { data, error } = await supabase
        .from('evaluation_forms')
        .update(form)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
      toast.success('Ficha de avaliação atualizada com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao atualizar ficha de avaliação.');
    },
  });
}

export function useDeleteEvaluationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('evaluation_forms')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
      toast.success('Ficha de avaliação excluída com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao excluir ficha de avaliação.');
    },
  });
}

// Field mutations
export function useAddFormField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ formId, field }: { formId: string; field: EvaluationFormFieldFormData }) => {
      const { data, error } = await supabase
        .from('evaluation_form_fields')
        .insert({ ...field, form_id: formId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-form', variables.formId] });
      toast.success('Campo adicionado com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao adicionar campo.');
    },
  });
}

export function useUpdateFormField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, formId, ...field }: Partial<EvaluationFormField> & { id: string; formId: string }) => {
      const { data, error } = await supabase
        .from('evaluation_form_fields')
        .update(field)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-form', variables.formId] });
      toast.success('Campo atualizado com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao atualizar campo.');
    },
  });
}

export function useDeleteFormField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, formId }: { id: string; formId: string }) => {
      const { error } = await supabase
        .from('evaluation_form_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-form', variables.formId] });
      toast.success('Campo excluído com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao excluir campo.');
    },
  });
}
