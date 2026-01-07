import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EvaluationForm, EvaluationFormWithFields, EvaluationFormField } from '@/types/clinical-forms';

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

      // Cast fields to ensure they match our frontend type (e.g. tipo_campo string -> enum)
      // We assume the DB values match the enum values
      return { ...form, fields } as unknown as EvaluationFormWithFields;
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
      // We need to cast the field type to string for Supabase insertion if types mismatch strictness
      // But typically it's fine.
      const { data, error } = await supabase
        .from('evaluation_form_fields')
        .insert({
          ...field,
          form_id: formId,
          // Ensure options is treated correctly (array vs jsonb)
          // Supabase typescript helper might expect Json, our type has string[]
          opcoes: field.opcoes ? JSON.stringify(field.opcoes) : null
        } as any) // Type casting to bypass potential strictness issues with generated types for now
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
      const updateData: any = { ...field };
      if (updateData.opcoes) {
        updateData.opcoes = JSON.stringify(updateData.opcoes);
      }

      const { data, error } = await supabase
        .from('evaluation_form_fields')
        .update(updateData)
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
