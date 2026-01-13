import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EvaluationForm, EvaluationFormWithFields, EvaluationFormField } from '@/types/clinical-forms';

export type EvaluationFormFormData = {
  nome: string;
  descricao?: string | null;
  referencias?: string | null;
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

export function useDuplicateEvaluationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Get original form
      const { data: originalForm, error: formError } = await supabase
        .from('evaluation_forms')
        .select('*')
        .eq('id', id)
        .single();

      if (formError) throw formError;

      // 2. Create new form
      const { data: newForm, error: createError } = await supabase
        .from('evaluation_forms')
        .insert({
          nome: `${originalForm.nome} (Cópia)`,
          descricao: originalForm.descricao,
          referencias: originalForm.referencias,
          tipo: originalForm.tipo,
          ativo: true,
          organization_id: originalForm.organization_id, // Preserve org if applicable
          created_by: originalForm.created_by // Preserve creator or let DB handle defaults
        })
        .select()
        .single();

      if (createError) throw createError;

      // 3. Get original fields
      const { data: fields, error: fieldsError } = await supabase
        .from('evaluation_form_fields')
        .select('*')
        .eq('form_id', id);

      if (fieldsError) throw fieldsError;

      // 4. Insert new fields
      if (fields && fields.length > 0) {
        const newFields = fields.map(f => ({
          form_id: newForm.id,
          tipo_campo: f.tipo_campo,
          label: f.label,
          placeholder: f.placeholder,
          opcoes: f.opcoes,
          ordem: f.ordem,
          obrigatorio: f.obrigatorio,
          grupo: f.grupo,
          descricao: f.descricao,
          minimo: f.minimo,
          maximo: f.maximo,
        }));

        const { error: insertFieldsError } = await supabase
          .from('evaluation_form_fields')
          .insert(newFields);

        if (insertFieldsError) throw insertFieldsError;
      }

      return newForm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
      toast.success('Ficha duplicada com sucesso.');
    },
    onError: (error) => {
      console.error(error);
      toast.error('Erro ao duplicar ficha.');
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
        .insert({
          ...field,
          form_id: formId,
          opcoes: field.opcoes ? JSON.stringify(field.opcoes) : null
        })
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
    mutationFn: async ({ id, _formId, ...field }: Partial<EvaluationFormField> & { id: string; formId: string }) => {
      const updateData: Record<string, unknown> = { ...field };
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
    mutationFn: async ({ id, _formId }: { id: string; formId: string }) => {
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

export type EvaluationFormImportData = {
  nome: string;
  descricao?: string | null;
  referencias?: string | null;
  tipo: string;
  fields: EvaluationFormFieldFormData[];
};

export function useImportEvaluationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EvaluationFormImportData) => {
      // 1. Create form
      const { data: form, error: formError } = await supabase
        .from('evaluation_forms')
        .insert({
          nome: data.nome,
          descricao: data.descricao,
          referencias: data.referencias,
          tipo: data.tipo,
          ativo: true,
        })
        .select()
        .single();

      if (formError) throw formError;

      // 2. Insert fields
      if (data.fields && data.fields.length > 0) {
        const fieldsToInsert = data.fields.map(f => ({
          form_id: form.id,
          tipo_campo: f.tipo_campo,
          label: f.label,
          placeholder: f.placeholder,
          opcoes: typeof f.opcoes === 'object' && f.opcoes !== null ? JSON.stringify(f.opcoes) : f.opcoes,
          ordem: f.ordem,
          obrigatorio: f.obrigatorio,
          grupo: f.grupo,
          descricao: f.descricao,
          minimo: f.minimo,
          maximo: f.maximo,
        }));

        const { error: fieldsError } = await supabase
          .from('evaluation_form_fields')
          .insert(fieldsToInsert);

        if (fieldsError) throw fieldsError;
      }

      return form;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
      toast.success('Ficha importada com sucesso.');
    },
    onError: (error) => {
      console.error(error);
      toast.error('Erro ao importar ficha.');
    },
  });
}
